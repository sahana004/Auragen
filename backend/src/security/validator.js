// Security validator: parses LLM-generated code into an AST and rejects anything unsafe.
// It never runs the code. It only reads its structure.

const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const MAX_CODE_CHARS = 60000;

// Only the design-system components may be used as <Components>.
const ALLOWED_COMPONENTS = new Set(["Button", "Input", "Select", "Card", "Stepper"]);

// Only these plain HTML tags may be used.
const ALLOWED_HTML_TAGS = new Set([
  "div", "p", "span", "h1", "h2", "h3", "h4", "label", "textarea", "input",
  "ul", "ol", "li", "strong", "em", "small", "section", "br", "hr",
]);

// Names the generated code may use without declaring them.
// Anything else that is not declared inside the code itself is rejected.
const ALLOWED_GLOBALS = new Set([
  "React", "useState", "useEffect", "useMemo", "useCallback", "useRef",
  ...ALLOWED_COMPONENTS,
  "Object", "Array", "String", "Number", "Boolean", "Math", "Date", "JSON",
  "RegExp", "Set", "Map", "parseInt", "parseFloat", "isNaN", "isFinite",
  "undefined", "NaN", "Infinity",
]);

// Property names that are used to escape sandboxes or inject HTML.
const FORBIDDEN_PROPERTIES = new Set([
  "constructor", "__proto__", "prototype",
  "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__",
  "defineProperty", "defineProperties", "setPrototypeOf", "getPrototypeOf",
  "innerHTML", "outerHTML", "insertAdjacentHTML", "srcdoc",
  "fromCharCode", "fromCodePoint",
]);

// Text fragments that are never allowed inside string literals.
const FORBIDDEN_STRING_PARTS = ["constructor", "__proto__", "prototype"];

// Computed keys like obj[key] are common, but unusual key expressions can hide attacks.
function isSafeKey(node) {
  switch (node.type) {
    case "Identifier":
    case "NumericLiteral":
    case "MemberExpression":
    case "OptionalMemberExpression":
      return true;
    case "StringLiteral":
      return !FORBIDDEN_PROPERTIES.has(node.value);
    case "BinaryExpression": {
      if (["-", "*", "/", "%"].includes(node.operator)) return true;
      // step + 1 is fine; a + b could be gluing strings together
      return node.operator === "+" && (node.left.type === "NumericLiteral" || node.right.type === "NumericLiteral");
    }
    default:
      return false;
  }
}

function validateWizard(code) {
  const violations = [];
  const add = (rule, message, node) =>
    violations.push({
      rule,
      message,
      line: node && node.loc ? node.loc.start.line : null,
      column: node && node.loc ? node.loc.start.column : null,
    });
  const finish = () => ({ valid: violations.length === 0, violations });

  if (typeof code !== "string" || !code.trim()) {
    add("syntax", "No code was provided", null);
    return finish();
  }
  if (code.length > MAX_CODE_CHARS) {
    add("size", `Code is longer than ${MAX_CODE_CHARS} characters`, null);
    return finish();
  }

  // 1. Parse (this also rejects truncated or broken code)
  let ast;
  try {
    ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
  } catch (err) {
    const loc = err.loc ? { loc: { start: { line: err.loc.line, column: err.loc.column } } } : null;
    add("syntax", err.message, loc);
    return finish();
  }

  // 2. Shape of the file: only function/const declarations plus one default export
  let defaultExports = 0;
  for (const stmt of ast.program.body) {
    if (stmt.type === "ExportDefaultDeclaration") {
      defaultExports += 1;
      const d = stmt.declaration;
      if (!(d.type === "FunctionDeclaration" && d.id && d.id.name === "Wizard")) {
        add("structure", "The default export must be: export default function Wizard(...) { ... }", stmt);
      }
    } else if (stmt.type === "FunctionDeclaration" || stmt.type === "VariableDeclaration") {
      // allowed
    } else if (["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(stmt.type)) {
      // reported by the visitors below
    } else {
      add("structure", `Top-level ${stmt.type} is not allowed (code must not run when the file loads)`, stmt);
    }
  }
  if (defaultExports !== 1) {
    add("structure", `Expected exactly one default export, found ${defaultExports}`, null);
  }

  // 3. Walk the whole tree
  try {
    traverse(ast, {
      ImportDeclaration(p) {
        add("import", "import statements are not allowed (React and the components are already in scope)", p.node);
      },
      ExportNamedDeclaration(p) {
        add("export", "named exports are not allowed", p.node);
      },
      ExportAllDeclaration(p) {
        add("export", "export * is not allowed", p.node);
      },
      CallExpression(p) {
        if (p.node.callee.type === "Import") add("import", "dynamic import() is not allowed", p.node);
      },
      ImportExpression(p) {
        add("import", "dynamic import() is not allowed", p.node);
      },
      MetaProperty(p) {
        add("global", "import.meta and new.target are not allowed", p.node);
      },
      DebuggerStatement(p) {
        add("statement", "debugger statements are not allowed", p.node);
      },

      // Every name the code uses must be declared in the code or be on the allowlist.
      // This one rule blocks eval, fetch, window, document, process, require, localStorage and so on.
      ReferencedIdentifier(p) {
        if (p.isJSXIdentifier()) return; // JSX element names are checked below
        const name = p.node.name;
        if (p.scope.hasBinding(name, true)) return;
        if (ALLOWED_GLOBALS.has(name)) return;
        add("global", `"${name}" is not available to generated code`, p.node);
      },

      "MemberExpression|OptionalMemberExpression"(p) {
        const { property, computed } = p.node;
        if (!computed) {
          if (property.type === "Identifier" && FORBIDDEN_PROPERTIES.has(property.name)) {
            add("member", `Access to ".${property.name}" is not allowed`, property);
          }
        } else {
          if (property.type === "StringLiteral" && FORBIDDEN_PROPERTIES.has(property.value)) {
            add("member", `Access to ["${property.value}"] is not allowed`, property);
          }
          if (!isSafeKey(property)) {
            add("member", "Computed property access with an unusual key is not allowed", property);
          }
        }
      },

      StringLiteral(p) {
        const bad = FORBIDDEN_STRING_PARTS.find((part) => p.node.value.includes(part));
        if (bad) add("string", `String contains forbidden text "${bad}"`, p.node);
      },
      TemplateElement(p) {
        const text = p.node.value.cooked || "";
        const bad = FORBIDDEN_STRING_PARTS.find((part) => text.includes(part));
        if (bad) add("string", `Template contains forbidden text "${bad}"`, p.node);
      },

      JSXOpeningElement(p) {
        const n = p.node.name;
        if (n.type !== "JSXIdentifier") {
          add("jsx-element", "Namespaced or member JSX element names are not allowed", n);
          return;
        }
        if (/^[A-Z]/.test(n.name)) {
          if (!ALLOWED_COMPONENTS.has(n.name)) {
            add("jsx-element", `<${n.name}> is not an allowed component (allowed: ${[...ALLOWED_COMPONENTS].join(", ")})`, n);
          }
        } else if (!ALLOWED_HTML_TAGS.has(n.name)) {
          add("jsx-element", `<${n.name}> is not an allowed HTML tag`, n);
        }
      },
      JSXAttribute(p) {
        const nameNode = p.node.name;
        const name = nameNode.type === "JSXNamespacedName" ? `${nameNode.namespace.name}:${nameNode.name.name}` : nameNode.name;
        if (name === "dangerouslySetInnerHTML") {
          add("jsx-attr", "dangerouslySetInnerHTML is not allowed", nameNode);
        }
        if (["href", "src", "srcDoc", "action", "formAction"].includes(name)) {
          add("jsx-attr", `The "${name}" attribute is not allowed`, nameNode);
        }
        if (/^on[A-Z]/.test(name) && p.node.value && p.node.value.type === "StringLiteral") {
          add("jsx-attr", `Event handler "${name}" must be a function, not a string`, nameNode);
        }
      },
      JSXSpreadAttribute(p) {
        add("jsx-attr", "JSX spread attributes are not allowed", p.node);
      },
    });
  } catch (err) {
    add("syntax", `Could not analyse the code: ${err.message}`, null);
  }

  return finish();
}

module.exports = { validateWizard, ALLOWED_COMPONENTS, ALLOWED_HTML_TAGS, ALLOWED_GLOBALS };