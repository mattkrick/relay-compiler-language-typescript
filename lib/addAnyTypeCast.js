"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function addAsAnyToObjectLiterals(oldSource) {
    function transformer(context) {
        return function transform(rootNode) {
            function visit(node) {
                if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {
                    return ts.createAsExpression(node, ts.createTypeReferenceNode("any", []));
                }
                return ts.visitEachChild(node, visit, context);
            }
            return ts.visitNode(rootNode, visit);
        };
    }
    var source = ts.createSourceFile("", oldSource, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
    var result = ts.transform(source, [transformer]);
    var printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed
    });
    return printer.printFile(result.transformed[0]);
}
exports.default = addAsAnyToObjectLiterals;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRkQW55VHlwZUNhc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYWRkQW55VHlwZUNhc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwrQkFBaUM7QUFFakMsa0NBQWlELFNBQWlCO0lBQ2hFLHFCQUF3QyxPQUFpQztRQUN2RSxPQUFPLG1CQUFtQixRQUFXO1lBQ25DLGVBQWUsSUFBYTtnQkFDMUIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLEVBQUU7b0JBQ3ZELE9BQU8sRUFBRSxDQUFDLGtCQUFrQixDQUMxQixJQUFxQixFQUNyQixFQUFFLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUN0QyxDQUFDO2lCQUNIO2dCQUNELE9BQU8sRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2pELENBQUM7WUFDRCxPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQ2hDLEVBQUUsRUFDRixTQUFTLEVBQ1QsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQ3RCLElBQUksRUFDSixFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FDakIsQ0FBQztJQUVGLElBQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUVuRCxJQUFNLE9BQU8sR0FBZSxFQUFFLENBQUMsYUFBYSxDQUFDO1FBQzNDLE9BQU8sRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVE7S0FDakMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFrQixDQUFDLENBQUM7QUFDbkUsQ0FBQztBQTlCRCwyQ0E4QkMifQ==