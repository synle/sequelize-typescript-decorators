import "reflect-metadata"; // library which adds a polyfill for an experimental metadata API, and requirement for some js decorators
import { DataTypes, DataType } from "sequelize";

export enum Relationship {
  hasOne = "hasOne",
  hasMany = "hasMany",
  belongsTo = "belongsTo",
  belongsToMany = "belongsToMany",
}

export interface AttributeProperty {
  type?: DataType;
  allowNull?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  defaultValue?: any;
  field?: string;
  [propName: string]: any;
}

export interface AssociationProperty {
  relationship: Relationship;
  foreignModel: any;
  sourceKey?: string;
  foreignKey?: string;
  as?: string;
  [propName: string]: any;
}

// decorators: more notes can be found here: https://codeburst.io/decorate-your-code-with-typescript-decorators-5be4a4ffecb4
// https://www.typescriptlang.org/docs/handbook/decorators.html
/**
 * class decorator used to decorate the table name
 * @param tableName
 */
export const table = (tableName: string) => {
  return function (constructorFunction: Function) {
    constructorFunction.prototype.dbTableName = tableName;
  };
};

/**
 * used to define field schema
 * @param model sequelize.Model
 * @param fieldSchema table attributes
 */
export const attribute = (model, fieldSchema: AttributeProperty) => {
  model.prototype.dbSchema = model.prototype.dbSchema || {};
  return function (target: any, key: string) {
    // getting the type of the property (class member)
    if (!fieldSchema.type) {
      var propertyType = Reflect.getMetadata("design:type", target, key);
      switch (propertyType.name) {
        case "Number":
          fieldSchema.type = DataTypes.NUMBER;
          break;
        case "Date":
          fieldSchema.type = DataTypes.DATE;
          break;
        case "Boolean":
          fieldSchema.type = DataTypes.BOOLEAN;
          break;
        case "String":
          fieldSchema.type = DataTypes.STRING;
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
export const relationship = (model, tableAssociation: AssociationProperty) => {
  model.prototype.dbAssociations = model.prototype.dbAssociations || [];
  return function (_target: any, name: string) {
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
export const initDatabase = async (sequelize, models: Array<any>) => {
  try {
    await sequelize.authenticate();

    // first create the models
    models.forEach((sourceModel) => {
      sourceModel.init(sourceModel.prototype.dbSchema, {
        tableName: sourceModel.prototype.dbTableName,
        sequelize, // sequelize instance - this bit is important
      });
    });

    // then do the association
    models.forEach((sourceModel) => {
      // setup associations
      const associations = sourceModel.prototype.dbAssociations || [];

      // now here we do association
      associations.forEach((association) => {
        const {
          as,
          sourceKey,
          relationship,
          foreignModel,
          foreignKey,
        } = association;

        // construct the relationship
        sourceModel[relationship](foreignModel, {
          sourceKey,
          foreignKey,
          as,
        });
      });
    });

    await sequelize.sync();
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1); // exit the app if the connection failed...
  }
};
