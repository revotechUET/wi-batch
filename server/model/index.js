"use strict";
let Sequelize = require('sequelize');
const config = require('config').database;

const sequelize = new Sequelize(config.dbName, config.user, config.password, {
    define: {
        freezeTableName: true
    },
    logging: config.logging,
    dialect: config.dialect,
    port: config.port,
    dialectOptions: {
        charset: 'utf8'
    },
    pool: {
        max: 2,
        min: 0,
        idle: 200
    },
    operatorsAliases: Sequelize.Op
    // storage: config.storage
});
sequelize.sync()
    .catch(function (err) {
        console.log(err);
    });
let models = [
    'User',
    'UserFileUploaded',
    'WellHeader'
];
models.forEach(function (model) {
    module.exports[model] = sequelize.import(__dirname + '/' + model);
});

(function (m) {
    m.User.hasMany(m.UserFileUploaded, {foreignKey: {name: "username", allowNull: false}, onDelete: 'CASCADE'});
    m.User.hasMany(m.WellHeader, {foreignKey: {name: "username", allowNull: false}, onDelete: 'CASCADE'});
})(module.exports);
module.exports.sequelize = sequelize;