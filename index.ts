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
export const table = (
  tableName: string,
  extraProperties: any = {
    timestamps: true,
  }
) => {
  return function (constructorFunction: Function) {
    constructorFunction.prototype.dbTableName = tableName;
    constructorFunction.prototype.dbExtraProperties = extraProperties;
  };
};

/**
 * used to define field schema
 * @param fieldSchema table attributes
 */
export const attribute = (fieldSchema: AttributeProperty = {}) => {
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
    target.prototype.dbSchema = target.prototype.dbSchema || {};
    target.prototype.dbSchema[key] = fieldSchema;
  };
};

/**
 * used to annotate relationship between tables
 * @param tableAssociation AssociationProperty association properties
 */
export const relationship = (tableAssociation: AssociationProperty) => {
  return function (target: any, name: string) {
    tableAssociation.sourceKey = tableAssociation.sourceKey || name;
    tableAssociation.foreignKey = tableAssociation.foreignKey || "id";
    tableAssociation.as = tableAssociation.foreignModel["as"];

    target.prototype.dbAssociations = target.prototype.dbAssociations || [];
    target.prototype.dbAssociations.push(tableAssociation);
  };
};

/**
 * class decorator used to set up indexes. Refer to https://sequelize.org/master/manual/indexes.html
 * for details...
 *
 * @param newIndexes
 */
export const index = (newIndexes) => {
  return function (constructorFunction: Function) {
    constructorFunction.prototype.dbIndexes = []
      .concat(newIndexes)
      .concat(constructorFunction.prototype.dbIndexes || []);
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
        indexes: sourceModel.prototype.dbIndexes,
        sequelize, // sequelize instance - this bit is important
        ...sourceModel.prototype.dbExtraProperties,
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
        let relationshipDetails;
        if (
          [Relationship.belongsTo, Relationship.belongsToMany].indexOf(
            relationship
          ) >= 0
        ) {
          relationshipDetails = {
            sourceKey,
            targetKey: foreignKey,
          };
          if (as) {
            relationshipDetails.through = as;
          }
        } else {
          relationshipDetails = {
            sourceKey,
            foreignKey,
          };

          if (as) {
            relationshipDetails.as = as;
          }
        }

        sourceModel[relationship](foreignModel, relationshipDetails);
      });
    });

    await sequelize.sync();
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1); // exit the app if the connection failed...
  }
};
