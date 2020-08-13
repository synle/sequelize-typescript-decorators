"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        tableAssociation.as =
            tableAssociation.foreignModel["as"] || tableAssociation.as;
        model.prototype.dbAssociations.push(tableAssociation);
    };
};
/**
 *
 * @param sequelize connected sequelize instance
 * @param models array of sequelize models
 */
exports.initDatabase = (sequelize, models) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield sequelize.authenticate();
        // first create the models
        models.forEach(sourceModel => {
            sourceModel.init(sourceModel.prototype.dbSchema, {
                tableName: sourceModel.prototype.dbTableName,
                sequelize // sequelize instance - this bit is important
            });
        });
        // then do the association
        models.forEach(sourceModel => {
            // setup associations
            const associations = sourceModel.prototype.dbAssociations || [];
            // now here we do association
            associations.forEach(association => {
                const { as, sourceKey, relationship, foreignModel, foreignKey } = association;
                // construct the relationship
                sourceModel[relationship](foreignModel, {
                    sourceKey,
                    foreignKey,
                    as
                });
            });
        });
        yield sequelize.sync();
    }
    catch (error) {
        console.error("Unable to connect to the database:", error);
        process.exit(1); // exit the app if the connection failed...
    }
});
//# sourceMappingURL=index.js.map