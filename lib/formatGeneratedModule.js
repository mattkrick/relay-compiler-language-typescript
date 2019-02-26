"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var addAnyTypeCast_1 = require("./addAnyTypeCast");
exports.formatterFactory = function (compilerOptions) {
    if (compilerOptions === void 0) { compilerOptions = {}; }
    return function (_a) {
        var moduleName = _a.moduleName, documentType = _a.documentType, docText = _a.docText, concreteText = _a.concreteText, typeText = _a.typeText, hash = _a.hash, _b = _a.relayRuntimeModule, relayRuntimeModule = _b === void 0 ? "relay-runtime" : _b, sourceHash = _a.sourceHash;
        var documentTypeImport = documentType
            ? "import { " + documentType + " } from \"" + relayRuntimeModule + "\";"
            : "";
        var docTextComment = docText ? "\n/*\n" + docText.trim() + "\n*/\n" : "";
        var nodeStatement = "const node = " + concreteText + " as " + (documentType ||
            "never") + ";";
        if (compilerOptions.noImplicitAny) {
            nodeStatement = addAnyTypeCast_1.default(nodeStatement).trim();
        }
        return "/* tslint:disable */\n\n" + documentTypeImport + "\n" + (typeText || "") + "\n\n" + docTextComment + "\n" + nodeStatement + "\n(node as any).hash = '" + sourceHash + "';\nexport default node;\n";
    };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0R2VuZXJhdGVkTW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Zvcm1hdEdlbmVyYXRlZE1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLG1EQUE4QztBQUVqQyxRQUFBLGdCQUFnQixHQUFHLFVBQzlCLGVBQXdDO0lBQXhDLGdDQUFBLEVBQUEsb0JBQXdDO0lBQ3ZCLE9BQUEsVUFBQyxFQVNuQjtZQVJDLDBCQUFVLEVBQ1YsOEJBQVksRUFDWixvQkFBTyxFQUNQLDhCQUFZLEVBQ1osc0JBQVEsRUFDUixjQUFJLEVBQ0osMEJBQW9DLEVBQXBDLHlEQUFvQyxFQUNwQywwQkFBVTtRQUVWLElBQU0sa0JBQWtCLEdBQUcsWUFBWTtZQUNyQyxDQUFDLENBQUMsY0FBWSxZQUFZLGtCQUFZLGtCQUFrQixRQUFJO1lBQzVELENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDUCxJQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDM0UsSUFBSSxhQUFhLEdBQUcsa0JBQWdCLFlBQVksYUFBTyxZQUFZO1lBQ2pFLE9BQU8sT0FBRyxDQUFDO1FBQ2IsSUFBSSxlQUFlLENBQUMsYUFBYSxFQUFFO1lBQ2pDLGFBQWEsR0FBRyx3QkFBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ3REO1FBQ0QsT0FBTyw2QkFFUCxrQkFBa0IsV0FDbEIsUUFBUSxJQUFJLEVBQUUsYUFFZCxjQUFjLFVBQ2QsYUFBYSxnQ0FDUyxVQUFVLCtCQUVqQyxDQUFDO0lBQ0YsQ0FBQztBQTdCa0IsQ0E2QmxCLENBQUMifQ==