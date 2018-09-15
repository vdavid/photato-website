const AWS = require('aws-sdk');

const dynamo = new AWS.DynamoDB.DocumentClient({region: 'us-east-1'}); // TODO: Use Frankfurt region!

const tableName = process.env.productTableName;

function create(event, context, callback) { // TODO: Use my own methods!
    const item = JSON.parse(event.body);
    dynamo.put(
        {
            Item: item,
            TableName: tableName
        },
        (error, response) => {
            if (error) {
                callback(error)
            } else {
                callback(null, {
                    statusCode: 201,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(response)
                })
            }
        }
    )
}

function get(event, context, callback) {
    const id = parseInt(event.pathParameters.id, 10);
    dynamo.get(
        {
            Key: {
                id
            },
            TableName: tableName
        },
        (error, data) => {
            if (error) {
                callback(error)
            } else {
                const product = data.Item;
                callback(null, {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(product)
                })
            }
        }
    )
}

function list(event, context, callback) {
    dynamo.scan(
        {
            TableName: tableName
        },
        (error, data) => {
            if (error) {
                callback(error)
            } else {
                const products = data.Items;
                callback(null, {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(products)
                })
            }
        }
    )
}

module.exports = {create, get, list};