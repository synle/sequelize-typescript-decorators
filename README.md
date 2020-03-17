# sequelize-typescript-decorators

### Decorator for table
```
function table(tableName: string) {
  return function(constructorFunction: Function) {
    constructorFunction.prototype.dbTableName = tableName;
  };
}
```


### Decorator for attribute
```
function attribute(model, tableAttributes: AttributeProperty) {
  model.prototype.dbSchema = model.prototype.dbSchema || {};
  return function(_target: any, name: string) {
    model.prototype.dbSchema[name] = tableAttributes;
  };
}
```


### Decorator for relationship
```
function relationship(model, tableAssociation: AssociationProperty) {
  model.prototype.dbAssociations = model.prototype.dbAssociations || [];
  return function(_target: any, name: string) {
    tableAssociation['sourceKey'] = tableAssociation['sourceKey'] || name;
    tableAssociation['foreignKey'] = tableAssociation['foreignKey'] || 'id';
    tableAssociation['as'] = tableAssociation['as'] || tableAssociation['foreignModel'];
    model.prototype.dbAssociations.push(tableAssociation);
  };
}
```

### Relationship enum and other enums
```
enum Relationship {
  hasOne = 'hasOne',
  hasMany = 'hasMany',
}


interface AttributeProperty{
  type: any;
  allowNull?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  [propName: string]: any;
}


interface AssociationProperty{
  relationship: string,
  foreignModel: string,
  sourceKey?: string,
  foreignKey?: string,
  as?: string;
  [propName: string]: any;
}
```

### Usage
```
import { Sequelize, DataTypes, ModelAttributes, Model } from 'sequelize';


enum AllModels {
  SalesforceCredential = 'SalesforceCredential',
  User = 'User',
}

@table('cordata_cordatauser')
export class User extends Model {
  @attribute(User, {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  })
  @relationship(User, {
    relationship: Relationship.hasOne,
    foreignModel: AllModels.SalesforceCredential,
    foreignKey: 'user_id',
  })
  public id!: number;

  @attribute(User, { type: DataTypes.STRING, allowNull: false })
  public password!: string;

  @attribute(User, { type: DataTypes.DATE(6), allowNull: false })
  public last_login!: Date;

  @attribute(User, { type: DataTypes.STRING, unique: true, allowNull: false })
  public email!: string;

  @attribute(User, { type: DataTypes.BOOLEAN })
  public is_active!: boolean;

  @attribute(User, { type: DataTypes.BOOLEAN })
  public is_canceled!: boolean;

  @attribute(User, { type: DataTypes.BOOLEAN })
  public is_admin!: boolean;

  // with association getter
  public readonly SalesforceCredential?: SalesforceCredential; // this is optional and only visible with includes
}
```

### Plumbing
```
import { Sequelize } from 'sequelize';
import * as SendbloomModels from './schema';

/**
 * this routine will initialize the database, please only run this once per all...
 */
export default async () => {
  const dbConnectionString = process.env.DB_URL || '';
  const sequelize = new Sequelize(dbConnectionString, {
    logging: false, // disable it for debugging
    define: {
      // Enforcing the table name to be equal to the model name
      freezeTableName: true,
      timestamps: false, // disable auto create createdAt and updatedAt
    },
  });

  try {
    await sequelize.authenticate();

    // then hook up the initiation for all the models / schema
    const models = Object.keys(SendbloomModels).map((modelName) => SendbloomModels[modelName]);
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
      const associations = sourceModel.prototype.dbAssociations;

      // now here we do association
      associations.forEach((association) => {
        const { as, sourceKey, relationship, foreignModel, foreignKey } = association;

        // construct the relationship
        sourceModel[relationship](SendbloomModels[foreignModel], {
          sourceKey,
          foreignKey,
          as,
        });
      });
    });
  } catch (error) {
    console.error('Unable to connect to the database:', dbConnectionString, error);
    process.exit(1); // exit the app if the connection failed...
  }
};
```
