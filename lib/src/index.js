"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var FindGraphQLTags_1 = require("./FindGraphQLTags");
var formatGeneratedModule_1 = require("./formatGeneratedModule");
var TypeScriptGenerator = require("./TypeScriptGenerator");
function plugin() {
    return {
        inputExtensions: ["ts", "tsx"],
        outputExtension: "ts",
        findGraphQLTags: FindGraphQLTags_1.find,
        formatModule: formatGeneratedModule_1.formatterFactory(),
        typeGenerator: TypeScriptGenerator
    };
}
exports.default = plugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSxxREFBeUM7QUFDekMsaUVBQTJEO0FBQzNELDJEQUE2RDtBQUU3RDtJQUNFLE9BQU87UUFDTCxlQUFlLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO1FBQzlCLGVBQWUsRUFBRSxJQUFJO1FBQ3JCLGVBQWUsRUFBRSxzQkFBSTtRQUNyQixZQUFZLEVBQUUsd0NBQWdCLEVBQUU7UUFDaEMsYUFBYSxFQUFFLG1CQUFtQjtLQUNuQyxDQUFDO0FBQ0osQ0FBQztBQVJELHlCQVFDIn0=