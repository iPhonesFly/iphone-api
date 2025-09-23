const { DataTypes, col } = require('sequelize');
const sequelize = require('../config/database');

const Iphone = sequelize.define('Iphone', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    model: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    storage: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    color: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    image: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    originalPrice: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    rating: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
})

module.exports = Iphone;