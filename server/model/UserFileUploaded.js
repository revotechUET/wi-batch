module.exports = function (sequelize, DataTypes) {
    return sequelize.define('user_file_uploaded', {
        idUserFileUploaded: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        fileName: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'NULL'
        },
        uploadedTime: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: Date.now()
        },
        type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "WELL_HEADER"
        }
    });
}