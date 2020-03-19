# sequelize-typescript-decorators
This documents how I set up decorators and use them with sequelize (node JS ORM library) to reduce boilderplate

### TODO's
- [ ] extract plumbing into a method and reuse it instead of having user of this library do it...
- [X] add support for other adapters: SQLITE, PG, etc...
- [ ] deploy to npm modules instead of using github
- [ ] integrate with CI pipeline to build stuffs automatically

### Credentials
```
DB_URL=mysql://root:StrongP@assword@127.0.0.1:3306/my_database
```


### How to use
#### Install it
```
npm install --save synle/sequelize-typescript-decorators#v1.0.0
```

#### Then declare it in your model...
```
import { DataTypes, Model } from 'sequelize';
import {
  Relationship,
  table,
  attribute,
  relationship,
} from 'sequelize-typescript-decorators';


@table('my_users')
export class User extends Model {
  @attribute(User, {
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  })
  @relationship(User, {
    relationship: Relationship.hasOne,
    foreignModel: 'SalesforceCredential',
    foreignKey: 'user_id',
  })
  public id!: number;

  @attribute(User, { allowNull: false })
  public password!: string;

  @attribute(User, { allowNull: false })
  public last_login!: Date;

  @attribute(User, { unique: true, allowNull: false })
  public email!: string;

  @attribute(User, {})
  public is_active!: boolean;

  @attribute(User, {})
  public is_canceled!: boolean;

  @attribute(User, {})
  public is_admin!: boolean;

  // with association getter
  public readonly SalesforceCredential?: SalesforceCredential;
}

@table('my_salesforcecredentials')
export class SalesforceCredential extends Model {
  @attribute(SalesforceCredential, {
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  })
  public id!: number;

  @attribute(SalesforceCredential, { allowNull: false })
  public sf_id!: string;

  @attribute(SalesforceCredential, { allowNull: false })
  public issued_at!: string;

  @attribute(SalesforceCredential, { allowNull: false })
  public scope!: string;

  @attribute(SalesforceCredential, { allowNull: false })
  public instance_url!: string;

  @attribute(SalesforceCredential, { allowNull: false })
  public refresh_token!: string;

  @attribute(SalesforceCredential, { allowNull: false })
  public signature!: string;

  @attribute(SalesforceCredential, { allowNull: false })
  public access_token!: string;

  @attribute(SalesforceCredential, {})
  public has_rest_api_access!: boolean;

  @attribute(SalesforceCredential, { allowNull: false })
  public sf_username!: string;

  @attribute(SalesforceCredential, {})
  public sf_bcc_address!: string;

  @attribute(SalesforceCredential, { allowNull: false })
  public initial_touch_status!: string;

  @attribute(SalesforceCredential, {})
  public task_type!: string;

  @attribute(SalesforceCredential, { allowNull: false })
  @relationship(SalesforceCredential, {
    relationship: Relationship.hasOne,
    foreignModel: AllModels.User,
  })
  public user_id!: number;

  // with association getter
  public readonly User?: User;
}
```


#### Plumbing it up
Note that db credentials should be stored in `DB_URL` in this format
`DB_URL=mysql://myuser:strongpassword@127.0.0.1:3306/my_db`
```
import { Sequelize } from 'sequelize';
import * as AllModelMaps from './schema';

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
    const models = Object.keys(AllModelMaps).map((modelName) => AllModelMaps[modelName]);
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
        sourceModel[relationship](AllModelMaps[foreignModel], {
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


### How to contribute?
Create PR against master.

#### Note on release pipeline
```
git tag v1.0.0
git push origin v1.0.0
```
