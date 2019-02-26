"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var relay_compiler_1 = require("relay-compiler");
var RelayCompilerPublic = require("relay-compiler/lib/RelayCompilerPublic");
var graphql_1 = require("graphql");
var ts = require("typescript");
var TypeScriptTypeTransformers_1 = require("./TypeScriptTypeTransformers");
var GraphQLCompiler = RelayCompilerPublic;
var IRVisitor = GraphQLCompiler.IRVisitor, SchemaUtils = GraphQLCompiler.SchemaUtils;
var isAbstractType = SchemaUtils.isAbstractType;
var REF_TYPE = " $refType";
var FRAGMENT_REFS = " $fragmentRefs";
exports.generate = function (node, options) {
    var ast = IRVisitor.visit(node, createVisitor(options));
    var printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed
    });
    var resultFile = ts.createSourceFile("grapghql-def.ts", "", ts.ScriptTarget.Latest, 
    /*setParentNodes*/ false, ts.ScriptKind.TS);
    var fullProgramAst = ts.updateSourceFileNode(resultFile, ast);
    return printer.printNode(ts.EmitHint.SourceFile, fullProgramAst, resultFile);
};
function nullthrows(obj) {
    if (obj == null) {
        throw new Error("Obj is null");
    }
    return obj;
}
function makeProp(selection, state, concreteType) {
    var value = selection.value;
    var key = selection.key, schemaName = selection.schemaName, conditional = selection.conditional, nodeType = selection.nodeType, nodeSelections = selection.nodeSelections;
    if (nodeType) {
        value = TypeScriptTypeTransformers_1.transformScalarType(nodeType, state, selectionsToAST([Array.from(nullthrows(nodeSelections).values())], state));
    }
    if (schemaName === "__typename" && concreteType) {
        value = ts.createLiteralTypeNode(ts.createLiteral(concreteType));
    }
    return readOnlyObjectTypeProperty(key, value, conditional);
}
var isTypenameSelection = function (selection) {
    return selection.schemaName === "__typename";
};
var hasTypenameSelection = function (selections) {
    return selections.some(isTypenameSelection);
};
var onlySelectsTypename = function (selections) {
    return selections.every(isTypenameSelection);
};
function selectionsToAST(selections, state, refTypeName) {
    var baseFields = new Map();
    var byConcreteType = {};
    flattenArray(selections).forEach(function (selection) {
        var concreteType = selection.concreteType;
        if (concreteType) {
            byConcreteType[concreteType] = byConcreteType[concreteType] || [];
            byConcreteType[concreteType].push(selection);
        }
        else {
            var previousSel = baseFields.get(selection.key);
            baseFields.set(selection.key, previousSel ? mergeSelection(selection, previousSel) : selection);
        }
    });
    var types = [];
    if (Object.keys(byConcreteType).length &&
        onlySelectsTypename(Array.from(baseFields.values())) &&
        (hasTypenameSelection(Array.from(baseFields.values())) ||
            Object.keys(byConcreteType).every(function (type) {
                return hasTypenameSelection(byConcreteType[type]);
            }))) {
        var _loop_1 = function (concreteType) {
            types.push(groupRefs(Array.from(baseFields.values()).concat(byConcreteType[concreteType])).map(function (selection) { return makeProp(selection, state, concreteType); }));
        };
        for (var concreteType in byConcreteType) {
            _loop_1(concreteType);
        }
        // It might be some other type than the listed concrete types. Ideally, we
        // would set the type to diff(string, set of listed concrete types), but
        // this doesn't exist in Flow at the time.
        var otherProp = readOnlyObjectTypeProperty("__typename", ts.createLiteralTypeNode(ts.createLiteral("%other")));
        var otherPropWithComment = ts.addSyntheticLeadingComment(otherProp, ts.SyntaxKind.MultiLineCommentTrivia, "This will never be '% other', but we need some\n" +
            "value in case none of the concrete values match.", true);
        types.push([otherPropWithComment]);
    }
    else {
        var selectionMap = selectionsToMap(Array.from(baseFields.values()));
        for (var concreteType in byConcreteType) {
            selectionMap = mergeSelections(selectionMap, selectionsToMap(byConcreteType[concreteType].map(function (sel) { return (__assign({}, sel, { conditional: true })); })));
        }
        var selectionMapValues = groupRefs(Array.from(selectionMap.values())).map(function (sel) {
            return isTypenameSelection(sel) && sel.concreteType
                ? makeProp(__assign({}, sel, { conditional: false }), state, sel.concreteType)
                : makeProp(sel, state);
        });
        types.push(selectionMapValues);
    }
    return ts.createUnionTypeNode(types.map(function (props) {
        if (refTypeName) {
            props.push(readOnlyObjectTypeProperty(REF_TYPE, ts.createTypeReferenceNode(ts.createIdentifier(refTypeName), undefined)));
        }
        return exactObjectTypeAnnotation(props);
    }));
}
// We don't have exact object types in typescript.
function exactObjectTypeAnnotation(properties) {
    return ts.createTypeLiteralNode(properties);
}
var idRegex = /^[$a-zA-Z_][$a-z0-9A-Z_]*$/;
function readOnlyObjectTypeProperty(propertyName, type, optional) {
    return ts.createPropertySignature([ts.createToken(ts.SyntaxKind.ReadonlyKeyword)], idRegex.test(propertyName)
        ? ts.createIdentifier(propertyName)
        : ts.createLiteral(propertyName), optional ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined, type, undefined);
}
function mergeSelection(a, b) {
    if (!a) {
        return __assign({}, b, { conditional: true });
    }
    return __assign({}, a, { nodeSelections: a.nodeSelections
            ? mergeSelections(a.nodeSelections, nullthrows(b.nodeSelections))
            : null, conditional: a.conditional && b.conditional });
}
function mergeSelections(a, b) {
    var merged = new Map();
    for (var _i = 0, _a = Array.from(a.entries()); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        merged.set(key, value);
    }
    for (var _c = 0, _d = Array.from(b.entries()); _c < _d.length; _c++) {
        var _e = _d[_c], key = _e[0], value = _e[1];
        merged.set(key, mergeSelection(a.get(key), value));
    }
    return merged;
}
function isPlural(node) {
    return Boolean(node.metadata && node.metadata.plural);
}
function exportType(name, type) {
    return ts.createTypeAliasDeclaration(undefined, [ts.createToken(ts.SyntaxKind.ExportKeyword)], ts.createIdentifier(name), undefined, type);
}
function importTypes(names, fromModule) {
    return ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined, ts.createNamedImports(names.map(function (name) {
        return ts.createImportSpecifier(undefined, ts.createIdentifier(name));
    }))), ts.createLiteral(fromModule));
}
function createVisitor(options) {
    var state = {
        customScalars: options.customScalars,
        enumsHasteModule: options.enumsHasteModule,
        existingFragmentNames: options.existingFragmentNames,
        generatedInputObjectTypes: {},
        generatedFragments: new Set(),
        optionalInputFields: options.optionalInputFields,
        relayRuntimeModule: options.relayRuntimeModule,
        usedEnums: {},
        usedFragments: new Set(),
        useHaste: options.useHaste,
        useSingleArtifactDirectory: options.useSingleArtifactDirectory,
        noFutureProofEnums: options.noFutureProofEnums
    };
    return {
        leave: {
            Root: function (node) {
                var inputVariablesType = generateInputVariablesType(node, state);
                var inputObjectTypes = generateInputObjectTypes(state);
                var responseType = exportType(node.name + "Response", selectionsToAST(node.selections, state));
                var operationType = exportType(node.name, exactObjectTypeAnnotation([
                    readOnlyObjectTypeProperty("response", ts.createTypeReferenceNode(responseType.name, undefined)),
                    readOnlyObjectTypeProperty("variables", ts.createTypeReferenceNode(inputVariablesType.name, undefined))
                ]));
                return getFragmentImports(state).concat(getEnumDefinitions(state), inputObjectTypes, [
                    inputVariablesType,
                    responseType,
                    operationType
                ]);
            },
            Fragment: function (node) {
                var flattenedSelections = flattenArray(node.selections);
                var numConecreteSelections = flattenedSelections.filter(function (s) { return s.concreteType; }).length;
                var selections = flattenedSelections.map(function (selection) {
                    if (numConecreteSelections <= 1 &&
                        isTypenameSelection(selection) &&
                        !isAbstractType(node.type)) {
                        return [
                            __assign({}, selection, { concreteType: node.type.toString() })
                        ];
                    }
                    return [selection];
                });
                state.generatedFragments.add(node.name);
                var refTypeName = getRefTypeName(node.name);
                var refTypeNodes = [];
                if (options.useSingleArtifactDirectory) {
                    var _refTypeName = "_" + refTypeName;
                    var _refType = ts.createVariableStatement([ts.createToken(ts.SyntaxKind.DeclareKeyword)], ts.createVariableDeclarationList([
                        ts.createVariableDeclaration(_refTypeName, ts.createTypeOperatorNode(ts.SyntaxKind.UniqueKeyword, ts.createKeywordTypeNode(ts.SyntaxKind.SymbolKeyword)))
                    ], ts.NodeFlags.Const));
                    var refType = exportType(refTypeName, ts.createTypeQueryNode(ts.createIdentifier(_refTypeName)));
                    refTypeNodes.push(_refType);
                    refTypeNodes.push(refType);
                }
                else {
                    var refType = exportType(refTypeName, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
                    refTypeNodes.push(refType);
                }
                var baseType = selectionsToAST(selections, state, refTypeName);
                var type = isPlural(node)
                    ? ts.createTypeReferenceNode(ts.createIdentifier("ReadonlyArray"), [
                        baseType
                    ])
                    : baseType;
                return getFragmentImports(state).concat(getEnumDefinitions(state), refTypeNodes, [
                    exportType(node.name, type)
                ]);
            },
            InlineFragment: function (node) {
                var typeCondition = node.typeCondition;
                return flattenArray(node.selections).map(function (typeSelection) {
                    return isAbstractType(typeCondition)
                        ? __assign({}, typeSelection, { conditional: true }) : __assign({}, typeSelection, { concreteType: typeCondition.toString() });
                });
            },
            Condition: function (node) {
                return flattenArray(node.selections).map(function (selection) {
                    return __assign({}, selection, { conditional: true });
                });
            },
            ScalarField: function (node) {
                return [
                    {
                        key: node.alias || node.name,
                        schemaName: node.name,
                        value: TypeScriptTypeTransformers_1.transformScalarType(node.type, state)
                    }
                ];
            },
            LinkedField: function (node) {
                return [
                    {
                        key: node.alias || node.name,
                        schemaName: node.name,
                        nodeType: node.type,
                        nodeSelections: selectionsToMap(flattenArray(node.selections))
                    }
                ];
            },
            FragmentSpread: function (node) {
                state.usedFragments.add(node.name);
                return [
                    {
                        key: "__fragments_" + node.name,
                        ref: node.name
                    }
                ];
            }
        }
    };
}
function selectionsToMap(selections) {
    var map = new Map();
    selections.forEach(function (selection) {
        var previousSel = map.get(selection.key);
        map.set(selection.key, previousSel ? mergeSelection(previousSel, selection) : selection);
    });
    return map;
}
function flattenArray(arrayOfArrays) {
    var result = [];
    arrayOfArrays.forEach(function (array) { return result.push.apply(result, array); });
    return result;
}
function generateInputObjectTypes(state) {
    return Object.keys(state.generatedInputObjectTypes).map(function (typeIdentifier) {
        var inputObjectType = state.generatedInputObjectTypes[typeIdentifier];
        if (inputObjectType === "pending") {
            throw new Error("TypeScriptGenerator: Expected input object type to have been" +
                " defined before calling `generateInputObjectTypes`");
        }
        else {
            return exportType(typeIdentifier, inputObjectType);
        }
    });
}
function generateInputVariablesType(node, state) {
    return exportType(node.name + "Variables", exactObjectTypeAnnotation(node.argumentDefinitions.map(function (arg) {
        return readOnlyObjectTypeProperty(arg.name, TypeScriptTypeTransformers_1.transformInputType(arg.type, state), !(arg.type instanceof graphql_1.GraphQLNonNull));
    })));
}
function groupRefs(props) {
    var result = [];
    var refs = [];
    props.forEach(function (prop) {
        if (prop.ref) {
            refs.push(prop.ref);
        }
        else {
            result.push(prop);
        }
    });
    if (refs.length > 0) {
        var value = ts.createIntersectionTypeNode(refs.map(function (ref) {
            return ts.createTypeReferenceNode(ts.createIdentifier(getRefTypeName(ref)), undefined);
        }));
        result.push({
            key: FRAGMENT_REFS,
            conditional: false,
            value: value
        });
    }
    return result;
}
function createAnyTypeAlias(name) {
    return ts.createTypeAliasDeclaration(undefined, undefined, ts.createIdentifier(name), undefined, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
}
function getFragmentImports(state) {
    var imports = [];
    if (state.usedFragments.size > 0) {
        var usedFragments = Array.from(state.usedFragments).sort();
        for (var _i = 0, usedFragments_1 = usedFragments; _i < usedFragments_1.length; _i++) {
            var usedFragment = usedFragments_1[_i];
            var refTypeName = getRefTypeName(usedFragment);
            if (!state.generatedFragments.has(usedFragment) &&
                state.useSingleArtifactDirectory &&
                state.existingFragmentNames.has(usedFragment)) {
                imports.push(importTypes([refTypeName], "./" + usedFragment + ".graphql"));
            }
            else {
                imports.push(createAnyTypeAlias(refTypeName));
            }
        }
    }
    return imports;
}
function anyTypeAlias(typeName) {
    return ts.createTypeAliasDeclaration(undefined, undefined, ts.createIdentifier(typeName), undefined, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
}
function getEnumDefinitions(_a) {
    var enumsHasteModule = _a.enumsHasteModule, usedEnums = _a.usedEnums, noFutureProofEnums = _a.noFutureProofEnums;
    var enumNames = Object.keys(usedEnums).sort();
    if (enumNames.length === 0) {
        return [];
    }
    if (enumsHasteModule) {
        return [importTypes(enumNames, enumsHasteModule)];
    }
    return enumNames.map(function (name) {
        var values = usedEnums[name].getValues().map(function (_a) {
            var value = _a.value;
            return value;
        });
        values.sort();
        if (!noFutureProofEnums) {
            values.push("%future added value");
        }
        return exportType(name, ts.createUnionTypeNode(values.map(function (value) { return stringLiteralTypeAnnotation(value); })));
    });
}
function stringLiteralTypeAnnotation(name) {
    return ts.createLiteralTypeNode(ts.createLiteral(name));
}
function getRefTypeName(name) {
    return name + "$ref";
}
exports.transforms = [
    relay_compiler_1.IRTransforms.commonTransforms[2],
    relay_compiler_1.IRTransforms.commonTransforms[3],
    relay_compiler_1.IRTransforms.printTransforms[0] // FlattenTransform.transformWithOptions({})
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHlwZVNjcmlwdEdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9UeXBlU2NyaXB0R2VuZXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxpREFJd0I7QUFDeEIsNEVBQThFO0FBRTlFLG1DQUF5QztBQUN6QywrQkFBaUM7QUFFakMsMkVBSXNDO0FBS3RDLElBQU0sZUFBZSxHQUFnQyxtQkFBbUIsQ0FBQztBQUVqRSxJQUFBLHFDQUFTLEVBQUUseUNBQVcsQ0FBcUI7QUFFM0MsSUFBQSwyQ0FBYyxDQUFpQjtBQUV2QyxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUM7QUFDN0IsSUFBTSxhQUFhLEdBQUcsZ0JBQWdCLENBQUM7QUFFMUIsUUFBQSxRQUFRLEdBQThCLFVBQUMsSUFBSSxFQUFFLE9BQU87SUFDL0QsSUFBTSxHQUFHLEdBQW1CLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzFFLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUM7UUFDL0IsT0FBTyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUTtLQUNqQyxDQUFDLENBQUM7SUFDSCxJQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQ3BDLGlCQUFpQixFQUNqQixFQUFFLEVBQ0YsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNO0lBQ3RCLGtCQUFrQixDQUFDLEtBQUssRUFDeEIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQ2pCLENBQUM7SUFDRixJQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2hFLE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDL0UsQ0FBQyxDQUFDO0FBY0Ysb0JBQXVCLEdBQXlCO0lBQzlDLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtRQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7S0FDaEM7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRCxrQkFDRSxTQUFvQixFQUNwQixLQUFZLEVBQ1osWUFBcUI7SUFFZixJQUFBLHVCQUFLLENBQWU7SUFDbEIsSUFBQSxtQkFBRyxFQUFFLGlDQUFVLEVBQUUsbUNBQVcsRUFBRSw2QkFBUSxFQUFFLHlDQUFjLENBQWU7SUFDN0UsSUFBSSxRQUFRLEVBQUU7UUFDWixLQUFLLEdBQUcsZ0RBQW1CLENBQ3pCLFFBQVEsRUFDUixLQUFLLEVBQ0wsZUFBZSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUMxRSxDQUFDO0tBQ0g7SUFDRCxJQUFJLFVBQVUsS0FBSyxZQUFZLElBQUksWUFBWSxFQUFFO1FBQy9DLEtBQUssR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0tBQ2xFO0lBQ0QsT0FBTywwQkFBMEIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQzdELENBQUM7QUFFRCxJQUFNLG1CQUFtQixHQUFHLFVBQUMsU0FBb0I7SUFDL0MsT0FBQSxTQUFTLENBQUMsVUFBVSxLQUFLLFlBQVk7QUFBckMsQ0FBcUMsQ0FBQztBQUN4QyxJQUFNLG9CQUFvQixHQUFHLFVBQUMsVUFBdUI7SUFDbkQsT0FBQSxVQUFVLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDO0FBQXBDLENBQW9DLENBQUM7QUFDdkMsSUFBTSxtQkFBbUIsR0FBRyxVQUFDLFVBQXVCO0lBQ2xELE9BQUEsVUFBVSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQztBQUFyQyxDQUFxQyxDQUFDO0FBRXhDLHlCQUNFLFVBQXlCLEVBQ3pCLEtBQVksRUFDWixXQUFvQjtJQUVwQixJQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQzdCLElBQU0sY0FBYyxHQUFvQyxFQUFFLENBQUM7SUFFM0QsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLFNBQVM7UUFDaEMsSUFBQSxxQ0FBWSxDQUFlO1FBQ25DLElBQUksWUFBWSxFQUFFO1lBQ2hCLGNBQWMsQ0FBQyxZQUFZLENBQUMsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2xFLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDOUM7YUFBTTtZQUNMLElBQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRWxELFVBQVUsQ0FBQyxHQUFHLENBQ1osU0FBUyxDQUFDLEdBQUcsRUFDYixXQUFXLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FDakUsQ0FBQztTQUNIO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFNLEtBQUssR0FBNkIsRUFBRSxDQUFDO0lBRTNDLElBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNO1FBQ2xDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDcEQsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUEsSUFBSTtnQkFDcEMsT0FBQSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7WUFBMUMsQ0FBMEMsQ0FDM0MsQ0FBQyxFQUNKO2dDQUNXLFlBQVk7WUFDckIsS0FBSyxDQUFDLElBQUksQ0FDUixTQUFTLENBQ0osS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsUUFDL0IsY0FBYyxDQUFDLFlBQVksQ0FBQyxFQUMvQixDQUFDLEdBQUcsQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLFFBQVEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxFQUF4QyxDQUF3QyxDQUFDLENBQzlELENBQUM7UUFDSixDQUFDO1FBUEQsS0FBSyxJQUFNLFlBQVksSUFBSSxjQUFjO29CQUE5QixZQUFZO1NBT3RCO1FBQ0QsMEVBQTBFO1FBQzFFLHdFQUF3RTtRQUN4RSwwQ0FBMEM7UUFDMUMsSUFBTSxTQUFTLEdBQUcsMEJBQTBCLENBQzFDLFlBQVksRUFDWixFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUNyRCxDQUFDO1FBQ0YsSUFBTSxvQkFBb0IsR0FBRyxFQUFFLENBQUMsMEJBQTBCLENBQ3hELFNBQVMsRUFDVCxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQixFQUNwQyxrREFBa0Q7WUFDaEQsa0RBQWtELEVBQ3BELElBQUksQ0FDTCxDQUFDO1FBQ0YsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztLQUNwQztTQUFNO1FBQ0wsSUFBSSxZQUFZLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwRSxLQUFLLElBQU0sWUFBWSxJQUFJLGNBQWMsRUFBRTtZQUN6QyxZQUFZLEdBQUcsZUFBZSxDQUM1QixZQUFZLEVBQ1osZUFBZSxDQUNiLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxjQUNuQyxHQUFHLElBQ04sV0FBVyxFQUFFLElBQUksSUFDakIsRUFIc0MsQ0FHdEMsQ0FBQyxDQUNKLENBQ0YsQ0FBQztTQUNIO1FBQ0QsSUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FDekUsVUFBQSxHQUFHO1lBQ0QsT0FBQSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsWUFBWTtnQkFDMUMsQ0FBQyxDQUFDLFFBQVEsY0FBTSxHQUFHLElBQUUsV0FBVyxFQUFFLEtBQUssS0FBSSxLQUFLLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQztnQkFDbkUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDO1FBRnhCLENBRXdCLENBQzNCLENBQUM7UUFDRixLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7S0FDaEM7SUFFRCxPQUFPLEVBQUUsQ0FBQyxtQkFBbUIsQ0FDM0IsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFBLEtBQUs7UUFDYixJQUFJLFdBQVcsRUFBRTtZQUNmLEtBQUssQ0FBQyxJQUFJLENBQ1IsMEJBQTBCLENBQ3hCLFFBQVEsRUFDUixFQUFFLENBQUMsdUJBQXVCLENBQ3hCLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsRUFDaEMsU0FBUyxDQUNWLENBQ0YsQ0FDRixDQUFDO1NBQ0g7UUFDRCxPQUFPLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDO0FBRUQsa0RBQWtEO0FBQ2xELG1DQUNFLFVBQWtDO0lBRWxDLE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFFRCxJQUFNLE9BQU8sR0FBRyw0QkFBNEIsQ0FBQztBQUU3QyxvQ0FDRSxZQUFvQixFQUNwQixJQUFpQixFQUNqQixRQUFrQjtJQUVsQixPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FDL0IsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFDL0MsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDeEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUM7UUFDbkMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLEVBQ2xDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQ2xFLElBQUksRUFDSixTQUFTLENBQ1YsQ0FBQztBQUNKLENBQUM7QUFFRCx3QkFDRSxDQUErQixFQUMvQixDQUFZO0lBRVosSUFBSSxDQUFDLENBQUMsRUFBRTtRQUNOLG9CQUNLLENBQUMsSUFDSixXQUFXLEVBQUUsSUFBSSxJQUNqQjtLQUNIO0lBQ0Qsb0JBQ0ssQ0FBQyxJQUNKLGNBQWMsRUFBRSxDQUFDLENBQUMsY0FBYztZQUM5QixDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNqRSxDQUFDLENBQUMsSUFBSSxFQUNSLFdBQVcsRUFBRSxDQUFDLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxXQUFXLElBQzNDO0FBQ0osQ0FBQztBQUVELHlCQUF5QixDQUFlLEVBQUUsQ0FBZTtJQUN2RCxJQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ3pCLEtBQTJCLFVBQXVCLEVBQXZCLEtBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBdkIsY0FBdUIsRUFBdkIsSUFBdUI7UUFBdkMsSUFBQSxXQUFZLEVBQVgsV0FBRyxFQUFFLGFBQUs7UUFDcEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDeEI7SUFDRCxLQUEyQixVQUF1QixFQUF2QixLQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQXZCLGNBQXVCLEVBQXZCLElBQXVCO1FBQXZDLElBQUEsV0FBWSxFQUFYLFdBQUcsRUFBRSxhQUFLO1FBQ3BCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDcEQ7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBRUQsa0JBQWtCLElBQW1DO0lBQ25ELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBRUQsb0JBQW9CLElBQVksRUFBRSxJQUFpQjtJQUNqRCxPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FDbEMsU0FBUyxFQUNULENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQzdDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFDekIsU0FBUyxFQUNULElBQUksQ0FDTCxDQUFDO0FBQ0osQ0FBQztBQUVELHFCQUFxQixLQUFlLEVBQUUsVUFBa0I7SUFDdEQsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQy9CLFNBQVMsRUFDVCxTQUFTLEVBQ1QsRUFBRSxDQUFDLGtCQUFrQixDQUNuQixTQUFTLEVBQ1QsRUFBRSxDQUFDLGtCQUFrQixDQUNuQixLQUFLLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSTtRQUNaLE9BQUEsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFBOUQsQ0FBOEQsQ0FDL0QsQ0FDRixDQUNGLEVBQ0QsRUFBRSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FDN0IsQ0FBQztBQUNKLENBQUM7QUFFRCx1QkFBdUIsT0FBNkI7SUFDbEQsSUFBTSxLQUFLLEdBQVU7UUFDbkIsYUFBYSxFQUFFLE9BQU8sQ0FBQyxhQUFhO1FBQ3BDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0I7UUFDMUMscUJBQXFCLEVBQUUsT0FBTyxDQUFDLHFCQUFxQjtRQUNwRCx5QkFBeUIsRUFBRSxFQUFFO1FBQzdCLGtCQUFrQixFQUFFLElBQUksR0FBRyxFQUFFO1FBQzdCLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxtQkFBbUI7UUFDaEQsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLGtCQUFrQjtRQUM5QyxTQUFTLEVBQUUsRUFBRTtRQUNiLGFBQWEsRUFBRSxJQUFJLEdBQUcsRUFBRTtRQUN4QixRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVE7UUFDMUIsMEJBQTBCLEVBQUUsT0FBTyxDQUFDLDBCQUEwQjtRQUM5RCxrQkFBa0IsRUFBRSxPQUFPLENBQUMsa0JBQWtCO0tBQy9DLENBQUM7SUFFRixPQUFPO1FBQ0wsS0FBSyxFQUFFO1lBQ0wsSUFBSSxZQUFDLElBQVM7Z0JBQ1osSUFBTSxrQkFBa0IsR0FBRywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ25FLElBQU0sZ0JBQWdCLEdBQUcsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3pELElBQU0sWUFBWSxHQUFHLFVBQVUsQ0FDMUIsSUFBSSxDQUFDLElBQUksYUFBVSxFQUN0QixlQUFlLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FDeEMsQ0FBQztnQkFDRixJQUFNLGFBQWEsR0FBRyxVQUFVLENBQzlCLElBQUksQ0FBQyxJQUFJLEVBQ1QseUJBQXlCLENBQUM7b0JBQ3hCLDBCQUEwQixDQUN4QixVQUFVLEVBQ1YsRUFBRSxDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQ3pEO29CQUNELDBCQUEwQixDQUN4QixXQUFXLEVBQ1gsRUFBRSxDQUFDLHVCQUF1QixDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FDL0Q7aUJBQ0YsQ0FBQyxDQUNILENBQUM7Z0JBQ0YsT0FDSyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsUUFDekIsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEVBQ3pCLGdCQUFnQjtvQkFDbkIsa0JBQWtCO29CQUNsQixZQUFZO29CQUNaLGFBQWE7bUJBQ2I7WUFDSixDQUFDO1lBRUQsUUFBUSxZQUFDLElBQVM7Z0JBQ2hCLElBQU0sbUJBQW1CLEdBQWdCLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3ZFLElBQU0sc0JBQXNCLEdBQUcsbUJBQW1CLENBQUMsTUFBTSxDQUN2RCxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxZQUFZLEVBQWQsQ0FBYyxDQUNwQixDQUFDLE1BQU0sQ0FBQztnQkFDVCxJQUFNLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBQSxTQUFTO29CQUNsRCxJQUNFLHNCQUFzQixJQUFJLENBQUM7d0JBQzNCLG1CQUFtQixDQUFDLFNBQVMsQ0FBQzt3QkFDOUIsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUMxQjt3QkFDQSxPQUFPO3lDQUVBLFNBQVMsSUFDWixZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7eUJBRXJDLENBQUM7cUJBQ0g7b0JBQ0QsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNyQixDQUFDLENBQUMsQ0FBQztnQkFDSCxLQUFLLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDeEMsSUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOUMsSUFBTSxZQUFZLEdBQWMsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLE9BQU8sQ0FBQywwQkFBMEIsRUFBRTtvQkFDdEMsSUFBTSxZQUFZLEdBQUcsTUFBSSxXQUFhLENBQUM7b0JBQ3ZDLElBQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyx1QkFBdUIsQ0FDekMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsRUFDOUMsRUFBRSxDQUFDLDZCQUE2QixDQUM5Qjt3QkFDRSxFQUFFLENBQUMseUJBQXlCLENBQzFCLFlBQVksRUFDWixFQUFFLENBQUMsc0JBQXNCLENBQ3ZCLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUMzQixFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FDdEQsQ0FDRjtxQkFDRixFQUNELEVBQUUsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUNuQixDQUNGLENBQUM7b0JBQ0YsSUFBTSxPQUFPLEdBQUcsVUFBVSxDQUN4QixXQUFXLEVBQ1gsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUMxRCxDQUFDO29CQUNGLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQzVCLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQzVCO3FCQUFNO29CQUNMLElBQU0sT0FBTyxHQUFHLFVBQVUsQ0FDeEIsV0FBVyxFQUNYLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUNuRCxDQUFDO29CQUNGLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQzVCO2dCQUNELElBQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUNqRSxJQUFNLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDO29CQUN6QixDQUFDLENBQUMsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsRUFBRTt3QkFDL0QsUUFBUTtxQkFDVCxDQUFDO29CQUNKLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQ2IsT0FDSyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsUUFDekIsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEVBQ3pCLFlBQVk7b0JBQ2YsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO21CQUMzQjtZQUNKLENBQUM7WUFFRCxjQUFjLFlBQUMsSUFBUztnQkFDdEIsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztnQkFDekMsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLGFBQWE7b0JBQ3BELE9BQU8sY0FBYyxDQUFDLGFBQWEsQ0FBQzt3QkFDbEMsQ0FBQyxjQUNNLGFBQWEsSUFDaEIsV0FBVyxFQUFFLElBQUksSUFFckIsQ0FBQyxjQUNNLGFBQWEsSUFDaEIsWUFBWSxFQUFFLGFBQWEsQ0FBQyxRQUFRLEVBQUUsR0FDdkMsQ0FBQztnQkFDUixDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7WUFDRCxTQUFTLFlBQUMsSUFBUztnQkFDakIsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLFNBQVM7b0JBQ2hELG9CQUNLLFNBQVMsSUFDWixXQUFXLEVBQUUsSUFBSSxJQUNqQjtnQkFDSixDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7WUFDRCxXQUFXLFlBQUMsSUFBUztnQkFDbkIsT0FBTztvQkFDTDt3QkFDRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSTt3QkFDNUIsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJO3dCQUNyQixLQUFLLEVBQUUsZ0RBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7cUJBQzdDO2lCQUNGLENBQUM7WUFDSixDQUFDO1lBQ0QsV0FBVyxZQUFDLElBQVM7Z0JBQ25CLE9BQU87b0JBQ0w7d0JBQ0UsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUk7d0JBQzVCLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSTt3QkFDckIsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJO3dCQUNuQixjQUFjLEVBQUUsZUFBZSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7cUJBQy9EO2lCQUNGLENBQUM7WUFDSixDQUFDO1lBQ0QsY0FBYyxZQUFDLElBQVM7Z0JBQ3RCLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbkMsT0FBTztvQkFDTDt3QkFDRSxHQUFHLEVBQUUsY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJO3dCQUMvQixHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUk7cUJBQ2Y7aUJBQ0YsQ0FBQztZQUNKLENBQUM7U0FDRjtLQUNGLENBQUM7QUFDSixDQUFDO0FBRUQseUJBQXlCLFVBQXVCO0lBQzlDLElBQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7SUFDdEIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFNBQVM7UUFDMUIsSUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0MsR0FBRyxDQUFDLEdBQUcsQ0FDTCxTQUFTLENBQUMsR0FBRyxFQUNiLFdBQVcsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUNqRSxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRCxzQkFBeUIsYUFBb0I7SUFDM0MsSUFBTSxNQUFNLEdBQVEsRUFBRSxDQUFDO0lBQ3ZCLGFBQWEsQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLLElBQUksT0FBQSxNQUFNLENBQUMsSUFBSSxPQUFYLE1BQU0sRUFBUyxLQUFLLEdBQXBCLENBQXFCLENBQUMsQ0FBQztJQUN0RCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBRUQsa0NBQWtDLEtBQVk7SUFDNUMsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLGNBQWM7UUFDcEUsSUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLHlCQUF5QixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3hFLElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRTtZQUNqQyxNQUFNLElBQUksS0FBSyxDQUNiLDhEQUE4RDtnQkFDNUQsb0RBQW9ELENBQ3ZELENBQUM7U0FDSDthQUFNO1lBQ0wsT0FBTyxVQUFVLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1NBQ3BEO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsb0NBQ0UsSUFBK0IsRUFDL0IsS0FBWTtJQUVaLE9BQU8sVUFBVSxDQUNaLElBQUksQ0FBQyxJQUFJLGNBQVcsRUFDdkIseUJBQXlCLENBQ3ZCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBQSxHQUFHO1FBQzlCLE9BQU8sMEJBQTBCLENBQy9CLEdBQUcsQ0FBQyxJQUFJLEVBQ1IsK0NBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFDbkMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFlBQVksd0JBQWMsQ0FBQyxDQUN0QyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQ0gsQ0FDRixDQUFDO0FBQ0osQ0FBQztBQUVELG1CQUFtQixLQUFrQjtJQUNuQyxJQUFNLE1BQU0sR0FBZ0IsRUFBRSxDQUFDO0lBQy9CLElBQU0sSUFBSSxHQUFhLEVBQUUsQ0FBQztJQUMxQixLQUFLLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSTtRQUNoQixJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNyQjthQUFNO1lBQ0wsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNuQjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUNuQixJQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsMEJBQTBCLENBQ3pDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBQSxHQUFHO1lBQ1YsT0FBQSxFQUFFLENBQUMsdUJBQXVCLENBQ3hCLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsRUFDeEMsU0FBUyxDQUNWO1FBSEQsQ0FHQyxDQUNGLENBQ0YsQ0FBQztRQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDVixHQUFHLEVBQUUsYUFBYTtZQUNsQixXQUFXLEVBQUUsS0FBSztZQUNsQixLQUFLLE9BQUE7U0FDTixDQUFDLENBQUM7S0FDSjtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCw0QkFBNEIsSUFBWTtJQUN0QyxPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FDbEMsU0FBUyxFQUNULFNBQVMsRUFDVCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQ3pCLFNBQVMsRUFDVCxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FDbkQsQ0FBQztBQUNKLENBQUM7QUFFRCw0QkFBNEIsS0FBWTtJQUN0QyxJQUFNLE9BQU8sR0FBbUIsRUFBRSxDQUFDO0lBQ25DLElBQUksS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFO1FBQ2hDLElBQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzdELEtBQTJCLFVBQWEsRUFBYiwrQkFBYSxFQUFiLDJCQUFhLEVBQWIsSUFBYTtZQUFuQyxJQUFNLFlBQVksc0JBQUE7WUFDckIsSUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ2pELElBQ0UsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQztnQkFDM0MsS0FBSyxDQUFDLDBCQUEwQjtnQkFDaEMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFDN0M7Z0JBQ0EsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFLLFlBQVksYUFBVSxDQUFDLENBQUMsQ0FBQzthQUN2RTtpQkFBTTtnQkFDTCxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7YUFDL0M7U0FDRjtLQUNGO0lBQ0QsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQUVELHNCQUFzQixRQUFnQjtJQUNwQyxPQUFPLEVBQUUsQ0FBQywwQkFBMEIsQ0FDbEMsU0FBUyxFQUNULFNBQVMsRUFDVCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQzdCLFNBQVMsRUFDVCxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FDbkQsQ0FBQztBQUNKLENBQUM7QUFFRCw0QkFBNEIsRUFJcEI7UUFITixzQ0FBZ0IsRUFDaEIsd0JBQVMsRUFDVCwwQ0FBa0I7SUFFbEIsSUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNoRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFCLE9BQU8sRUFBRSxDQUFDO0tBQ1g7SUFDRCxJQUFJLGdCQUFnQixFQUFFO1FBQ3BCLE9BQU8sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztLQUNuRDtJQUNELE9BQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFBLElBQUk7UUFDdkIsSUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFDLEVBQVM7Z0JBQVAsZ0JBQUs7WUFBTyxPQUFBLEtBQUs7UUFBTCxDQUFLLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDZCxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDdkIsTUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1NBQ3BDO1FBQ0QsT0FBTyxVQUFVLENBQ2YsSUFBSSxFQUNKLEVBQUUsQ0FBQyxtQkFBbUIsQ0FDcEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEtBQUssSUFBSSxPQUFBLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxFQUFsQyxDQUFrQyxDQUFDLENBQ3hELENBQ0YsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELHFDQUFxQyxJQUFZO0lBQy9DLE9BQU8sRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMxRCxDQUFDO0FBRUQsd0JBQXdCLElBQVk7SUFDbEMsT0FBVSxJQUFJLFNBQU0sQ0FBQztBQUN2QixDQUFDO0FBRVksUUFBQSxVQUFVLEdBQWdDO0lBQ3JELDZCQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBQ2hDLDZCQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0lBQ2hDLDZCQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLDRDQUE0QztDQUM3RSxDQUFDIn0=