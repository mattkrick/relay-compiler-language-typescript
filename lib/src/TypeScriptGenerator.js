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
var graphql_1 = require("graphql");
var ts = require("typescript");
var TypeScriptTypeTransformers_1 = require("./TypeScriptTypeTransformers");
var isAbstractType = relay_compiler_1.SchemaUtils.isAbstractType;
var REF_TYPE = " $refType";
var FRAGMENT_REFS = " $fragmentRefs";
exports.generate = function (node, options) {
    var ast = relay_compiler_1.IRVisitor.visit(node, createVisitor(options));
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
    var discriminators = Array.from(baseFields.values()).filter(isTypenameSelection);
    var _loop_1 = function (concreteType) {
        types.push(groupRefs(discriminators.concat(byConcreteType[concreteType])).map(function (selection) { return makeProp(selection, state, concreteType); }));
    };
    for (var concreteType in byConcreteType) {
        _loop_1(concreteType);
    }
    if (types.length) {
        // It might be some other type than the listed concrete types.
        // Ideally, we would set the type to Exclude<string, set of listed concrete types>,
        // but this doesn't work with TypeScript's discriminated unions.
        var otherProp = readOnlyObjectTypeProperty("__typename", ts.createLiteralTypeNode(ts.createLiteral("%other")));
        var otherPropWithComment = ts.addSyntheticLeadingComment(otherProp, ts.SyntaxKind.MultiLineCommentTrivia, "This will never be '% other', but we need some\n" +
            "value in case none of the concrete values match.", true);
        types.push([otherPropWithComment]);
    }
    var selectionMap = selectionsToMap(Array.from(baseFields.values()));
    for (var concreteType in byConcreteType) {
        selectionMap = mergeSelections(selectionMap, selectionsToMap(byConcreteType[concreteType].map(function (sel) { return (__assign({}, sel, { conditional: true })); })));
    }
    var baseProps = groupRefs(Array.from(selectionMap.values())).map(function (sel) {
        return isTypenameSelection(sel) && sel.concreteType
            ? makeProp(__assign({}, sel, { conditional: false }), state, sel.concreteType)
            : makeProp(sel, state);
    });
    if (refTypeName) {
        baseProps.push(readOnlyObjectTypeProperty(REF_TYPE, ts.createTypeReferenceNode(ts.createIdentifier(refTypeName), undefined)));
    }
    if (types.length > 0) {
        var unionType = ts.createUnionTypeNode(types.map(function (props) {
            return exactObjectTypeAnnotation(props);
        }));
        return ts.createIntersectionTypeNode([
            exactObjectTypeAnnotation(baseProps),
            unionType
        ]);
    }
    else {
        return exactObjectTypeAnnotation(baseProps);
    }
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
            ModuleImport: function (node) {
                return [
                    {
                        key: "__fragmentPropName",
                        conditional: true,
                        value: TypeScriptTypeTransformers_1.transformScalarType(graphql_1.GraphQLString, state)
                    },
                    {
                        key: "__module_component",
                        conditional: true,
                        value: TypeScriptTypeTransformers_1.transformScalarType(graphql_1.GraphQLString, state)
                    },
                    {
                        key: "__fragments_" + node.name,
                        ref: node.name
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
// Should match FLOW_TRANSFORMS array
// https://github.com/facebook/relay/blob/v4.0.0/packages/relay-compiler/language/javascript/RelayFlowGenerator.js#L621-L627
exports.transforms = [
    relay_compiler_1.IRTransforms.commonTransforms[1],
    relay_compiler_1.IRTransforms.commonTransforms[2],
    relay_compiler_1.IRTransforms.commonTransforms[3],
    relay_compiler_1.IRTransforms.printTransforms[3],
    relay_compiler_1.IRTransforms.commonTransforms[4] // RelayRefetchableFragmentTransform.transform,
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHlwZVNjcmlwdEdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9UeXBlU2NyaXB0R2VuZXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSxpREFRd0I7QUFHeEIsbUNBQXdEO0FBQ3hELCtCQUFpQztBQUVqQywyRUFJc0M7QUFFOUIsSUFBQSw0REFBYyxDQUFpQjtBQUV2QyxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUM7QUFDN0IsSUFBTSxhQUFhLEdBQUcsZ0JBQWdCLENBQUM7QUFFMUIsUUFBQSxRQUFRLEdBQThCLFVBQUMsSUFBSSxFQUFFLE9BQU87SUFDL0QsSUFBTSxHQUFHLEdBQW1CLDBCQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMxRSxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDO1FBQy9CLE9BQU8sRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVE7S0FDakMsQ0FBQyxDQUFDO0lBQ0gsSUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUNwQyxpQkFBaUIsRUFDakIsRUFBRSxFQUNGLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTTtJQUN0QixrQkFBa0IsQ0FBQyxLQUFLLEVBQ3hCLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUNqQixDQUFDO0lBQ0YsSUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNoRSxPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQy9FLENBQUMsQ0FBQztBQWNGLG9CQUF1QixHQUF5QjtJQUM5QyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7UUFDZixNQUFNLElBQUksS0FBSyxDQUFD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