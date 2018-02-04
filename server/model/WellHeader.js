module.exports = function (sequelize, DataTypes) {
    return sequelize.define('well_header', {
        idWellHeader: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        wellName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        idWell: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        header: {
            type: DataTypes.TEXT,
            allowNull: false,
            set(value) {
                this.setDataValue('header', typeof(value) === 'object' ? JSON.stringify(value) : value);
            },
            get() {
                const value = this.getDataValue('header');
                return JSON.parse(value);
            }
        }
    });
}