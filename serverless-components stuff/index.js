// TODO: What will run this file?
const { readFile } = require('fs');

module.exports = {
    async deploy(inputs, context) {
        const productsDb = await context.children.productsDb;
        const products = await new Promise((resolve, reject) =>
            readFile('data/products.json', (err, data) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(JSON.parse(data))
                }
            })
        );

        if (products.length > 0) { // TODO: Modify this to fill my own DB with some fake data
            const tableName = `products-${context.serviceId}`;
            context.log(`Seeding ${products.length} items into table ${tableName}.`);

            const insertItem = (triesLeft, wait) => (product) =>
                productsDb.fns
                    .insert(productsDb.inputs, {
                        log: context.log,
                        state: productsDb.state,
                        options: {
                            tablename: tableName,
                            itemdata: product
                        }
                    })
                    .catch(async (error) => {
                        if (triesLeft > 0) {
                            return new Promise((resolve, reject) => {
                                setTimeout(() => {
                                    const doInsert = insertItem(triesLeft - 1, wait)(product);
                                    doInsert.then(resolve, reject)
                                }, wait)
                            })
                        }

                        throw error
                    });

            const insertions = products.map(JSON.stringify).map(insertItem(30, 8000));
            await Promise.all(insertions)
        }
    }
};