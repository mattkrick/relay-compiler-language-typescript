"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatterFactory = function () { return function (_a) {
    var moduleName = _a.moduleName, documentType = _a.documentType, docText = _a.docText, concreteText = _a.concreteText, typeText = _a.typeText, sourceHash = _a.sourceHash;
    var documentTypeImport = documentType
        ? "import { " + documentType + " } from \"relay-runtime\";"
        : "";
    var docTextComment = docText ? "\n/*\n" + docText.trim() + "\n*/\n" : "";
    var nodeStatement = "const node = (" + concreteText + ") as " + (documentType ||
        "never") + ";";
    return "/* tslint:disable */\n\n" + documentTypeImport + "\n" + (typeText || "") + "\n\n" + docTextComment + "\n" + nodeStatement + "\n(node as any).hash = '" + sourceHash + "';\nexport default node;\n";
}; };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0R2VuZXJhdGVkTW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Zvcm1hdEdlbmVyYXRlZE1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVhLFFBQUEsZ0JBQWdCLEdBQUcsY0FBb0IsT0FBQSxVQUFDLEVBT3BEO1FBTkMsMEJBQVUsRUFDViw4QkFBWSxFQUNaLG9CQUFPLEVBQ1AsOEJBQVksRUFDWixzQkFBUSxFQUNSLDBCQUFVO0lBRVYsSUFBTSxrQkFBa0IsR0FBRyxZQUFZO1FBQ3JDLENBQUMsQ0FBQyxjQUFZLFlBQVksK0JBQTBCO1FBQ3BELENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDUCxJQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDM0UsSUFBTSxhQUFhLEdBQUcsbUJBQWlCLFlBQVksY0FBUSxZQUFZO1FBQ3JFLE9BQU8sT0FBRyxDQUFDO0lBQ2IsT0FBTyw2QkFFUCxrQkFBa0IsV0FDbEIsUUFBUSxJQUFJLEVBQUUsYUFFZCxjQUFjLFVBQ2QsYUFBYSxnQ0FDUyxVQUFVLCtCQUVqQyxDQUFDO0FBQ0YsQ0FBQyxFQXhCbUQsQ0F3Qm5ELENBQUMifQ==