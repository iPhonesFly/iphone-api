const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    sender: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
    },
    messageType: {
        type: DataTypes.ENUM('user', 'system'),
        defaultValue: 'user',
        allowNull: false,
    },
    isCurrentUser: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    }
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['timestamp']
        },
        {
            fields: ['sender']
        }
    ]
});

module.exports = Message;