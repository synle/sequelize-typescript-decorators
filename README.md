![CI Job Status](https://github.com/synle/sequelize-typescript-decorators/workflows/Package%20and%20Publish%20to%20NPM/badge.svg)
[![npm version](https://badge.fury.io/js/sequelize-typescript-decorators.svg)](https://badge.fury.io/js/sequelize-typescript-decorators)

# sequelize-typescript-decorators

This documents how I set up decorators and use them with sequelize (node JS ORM library) to reduce boilderplate

### TODO's

- [x] extract plumbing into a method and reuse it instead of having user of this library do it...
- [x] add support for other adapters: SQLITE, PG, etc...
- [x] deploy to npm modules instead of using github
- [x] integrate with CI pipeline to build stuffs automatically
- [x] add docs
- [ ] add unit tests

### Credentials

```
DB_URL=mysql://root:StrongP@assword@127.0.0.1:3306/my_database
```

### How to use

#### Install it

To install from npm

```
npm install --save sequelize-typescript-decorators@^2

# based on your database engine, you will need to include different things
```

#### Then declare it in your model...

In our example, Email can have one or many attachments. Keep that in mind for relationship

##### ./models/schema.ts

```
import {
  Relationship,
  table,
  attribute,
  relationship,
  index,
} from "sequelize-typescript-decorators";

import { DataTypes, Model } from "sequelize";

@table("attachments", {
  timestamps: false,
})
@index([
  {
    unique: false,
    fields: ["messageId"],
  },
  {
    unique: false,
    fields: ["fileName"],
  },
])
export class Attachment extends Model {
  @attribute(Attachment, {
    allowNull: false,
    primaryKey: true,
  })
  public id!: string;

  @attribute(Attachment, { allowNull: false })
  public messageId!: string;

  @attribute(Attachment, { allowNull: false })
  public mimeType!: string;

  @attribute(Attachment, { allowNull: false })
  public fileName!: string;

  @attribute(Attachment, { allowNull: false })
  public path!: string;
}

@table("emails", {
  timestamps: false,
})
@index([
  {
    unique: false,
    fields: ["threadId"],
  },
  {
    unique: false,
    fields: ["from"],
  },
])
export class Email extends Model {
  @attribute(Email, {
    allowNull: false,
    primaryKey: true,
  })
  public id!: string;

  @attribute(Email, { allowNull: false })
  public threadId!: string;

  @attribute(Email, { allowNull: false })
  public from!: string;

  @attribute(Email)
  public to!: string;

  @attribute(Email)
  public bcc!: string;

  @attribute(Email, { type: DataTypes.TEXT })
  public body!: string;

  @attribute(Email, { type: DataTypes.TEXT })
  public rawBody!: string;

  @attribute(Email)
  public subject!: string;

  @attribute(Email)
  public date!: number;

  @attribute(Email)
  public headers!: string;

  @relationship(Email, {
    relationship: Relationship.hasMany,
    sourceKey: "id",
    foreignModel: Attachment,
    foreignKey: "messageId",
    as: "attachments",
  })
  public Attachments!: any[];
}

export default {
  Attachment,
  Email,
};
```

##### ./models/factory.ts

```
import { Sequelize } from 'sequelize';
import {
  initDatabase,
} from 'sequelize-typescript-decorators';
import Models from "./schema";

/**
 * this routine will initialize the database, please only run this once per all...
 */
export default async () => {
  // this is an example to connect to sqlite3
  // set up your connection accordingly
  const dbConnectionString = process.env.DB_URL || "";
  const sequelize = new Sequelize("note_synchronize", "username", "password", {
    dialect: "sqlite",
    storage: dbConnectionString,
    logging: false,
  });

  const models = Object.keys(Models).map((modelName) => Models[modelName]);

  await initDatabase(sequelize, models);
};
```

#### How to call and use it?

Somewhere in your entry code, runs and wait for the init

```
import initDatabase from "./src/models/factory";
import Models from "./src/models/schema";

async function _doWork(){
  await initDatabase();

  // start your work here
  // get list of emails and associated attachments...
  const matchedEmailsResponse = await Models.Email.findAll({
    include: [
      {
        model: Models.Attachment,
        required: false,
      },
    ],
  });
}

_doWork();
```

### How to contribute?

Create PR against master.

#### Note on release pipeline

```
version="$(cat package.json  | jq .version)"
git tag $version
git push origin $version
```
