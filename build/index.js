"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata"); // library which adds a polyfill for an experimental metadata API, and requirement for some js decorators
const sequelize_1 = require("sequelize");
var Relationship;
(function (Relationship) {
    Relationship["hasOne"] = "hasOne";
    Relationship["hasMany"] = "hasMany";
    Relationship["belongsTo"] = "belongsTo";
    Relationship["belongsToMany"] = "belongsToMany";
})(Relationship = exports.Relationship || (exports.Relationship = {}));
// decorators: more notes can be found here: https://codeburst.io/decorate-your-code-with-typescript-decorators-5be4a4ffecb4
// https://www.typescriptlang.org/docs/handbook/decorators.html
/**
 * class decorator used to decorate the table name
 * @param tableName
 */
exports.table = (tableName) => {
    return function (constructorFunction) {
        constructorFunction.prototype.dbTableName = tableName;
    };
};
/**
 * used to define field schema
 * @param model sequelize.Model
 * @param fieldSchema table attributes
 */
exports.attribute = (model, fieldSchema) => {
    model.prototype.dbSchema = model.prototype.dbSchema || {};
    return function (target, key) {
        // getting the type of the property (class member)
        if (!fieldSchema.type) {
            var propertyType = Reflect.getMetadata("design:type", target, key);
            switch (propertyType.name) {
                case "Number":
                    fieldSchema.type = sequelize_1.DataTypes.NUMBER;
                    break;
                case "Date":
                    fieldSchema.type = sequelize_1.DataTypes.DATE;
                    break;
                case "Boolean":
                    fieldSchema.type = sequelize_1.DataTypes.BOOLEAN;
                    break;
                case "String":
                    fieldSchema.type = sequelize_1.DataTypes.STRING;
                    break;
            }
        }
        // set the dbschema
        model.prototype.dbSchema[key] = fieldSchema;
    };
};
/**
 * used to annotate relationship between tables
 * @param model sequelize.Model
 * @param tableAssociation AssociationProperty association properties
 */
exports.relationship = (model, tableAssociation) => {
    model.prototype.dbAssociations = model.prototype.dbAssociations || [];
    return function (_target, name) {
        tableAssociation.sourceKey = tableAssociation.sourceKey || name;
        tableAssociation.foreignKey = tableAssociation.foreignKey || "id";
        tableAssociation.as = tableAssociation.as || tableAssociation.foreignModel;
        model.prototype.dbAssociations.push(tableAssociation);
    };
};
//# sourceMappingURL=index.js.map