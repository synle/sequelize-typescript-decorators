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
function attribute(model, tableAttributes: object) {
  model.prototype.dbSchema = model.prototype.dbSchema || {};
  return function(_target: any, name: string) {
    model.prototype.dbSchema[name] = tableAttributes;
  };
}
```

### Usage
```
import { Sequelize, DataTypes, ModelAttributes, Model } from 'sequelize';

@table('cordata_cordatauser')
export class User extends Model {
  @attribute(User, {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
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

  // set up association has or belong relationship
  static getModelRelationships = () => {
    return [
      {
        as: 'SalesforceCredential',
        sourceKey: 'id',
        relationship: Relationship.hasOne,
        foreignModel: SalesforceCredential,
        foreignKey: 'user_id',
      },
    ];
  };
}
```

### Plumbing
```
import { Sequelize } from 'sequelize';
import * as SendbloomModels from './schema';

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
      const associations = sourceModel.getModelRelationships();

      // now here we do association
      associations.forEach((association) => {
        const { as, sourceKey, relationship, foreignModel, foreignKey } = association;

        // construct the relationship
        sourceModel[relationship](foreignModel, {
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
