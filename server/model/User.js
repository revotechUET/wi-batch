module.exports = function (sequelize, DataTypes) {
    return sequelize.define('user', {
        username: {
            type: DataTypes.STRING(100),
            allowNull: false,
            primaryKey: true
        }
    });
}