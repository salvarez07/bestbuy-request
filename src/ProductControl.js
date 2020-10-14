const helpers = require('./helpers.js');
const {getProductResults} = require('./requests.js');
const {writeFile, readLargeJSON} = require('./fileManager.js');
const asyncForEach = require('./asyncForEach.js');

const state = {
	products: {}
}

const getFirstResult = (categoryId) => {
	return getProductResults(categoryId);
}

const parseCategory = (product) => {
    const category = product.categoryPath.map(categoryObj => categoryObj['name']);
    category.shift();
    
    let temp = '';

    category.forEach((cat, index) => {
        category[index] = temp + cat;
        temp += cat + "|";
    });

    return category;
}
const getResult = (index, categoryId) => {
    return new Promise(r => {
        setTimeout
        (async() => {
            await getProductResults(categoryId, index).then(response => {
                
                const productResponse = response.data.products.map(product => {

                    const p = {
                        ...product,
                        sku: "" + product.sku + "",
                        features: product.features.map(feature => feature['feature']),
                        body: product.shortDescription + '. ' + product.longDescription,
                        category: parseCategory(product),
                        details: product.details.reduce((acc, cur) => {
                            if(cur.value.toLowerCase() === 'yes') {
                                acc.push(cur.name);
                            }
                            return acc;
                        }, []),
                        objecttype: "Product"
                    };

                    delete p.categoryPath;

                    if(p.color === null || p.color === "null"){
                        delete p.color;
                    }

                    return p;
                });

                state.products[categoryId].push(...productResponse);
            })
            .catch(async(error) => {
                if (error.response) {
                    if(error.response.status === 403){
                        await getResult(index, categoryId).then(() => {
                            console.log('ran getResult again.');
                        });
                    }
                } 
            });
            r();
        }, helpers.requestCallLimit);
    });
}

const getResults = async (categoryId, response) => {
	const start = response.data.currentPage;
    const end = response.data.totalPages + 1;

    for(let i = start; i < end; i++) {
        await getResult(i, categoryId);
	}
}

const getResultsPerCategory = async (categoryId) => {
    return new Promise(r => {
        setTimeout(async() => {
            await getFirstResult(categoryId).then(
                async(response) => {
                    await getResults(categoryId, response);
                }
            )
            .catch(async(error) => {
                if (error.response) {
                    console.log('Error for N result');
                    console.log('error.response.status', error.response.status);

                    if(error.response.status === 403){
                        await getResultsPerCategory(categoryId).then(() => {
                            console.log('ran getResultsPerCategory again.');
                        });
                    }
                } 
            });
            r();
        }, helpers.requestCallLimit);
    });
}

const createProducts = async (fileRead) => {

    if(fileRead) {
        state.products = await readLargeJSON(false, 'pre-products.json');
    }

    const categoryValues = Object.values(helpers.categories);
    
	await asyncForEach(categoryValues, async (categoryId) => {
        console.log('categoryId', categoryId);
        
        if(state.products[categoryId]) {
            console.log('category is here');
            return;
        }

        state.products[categoryId] = [];

        await getResultsPerCategory(categoryId);

        await writeFile('pre-products.json', state.products);
    });
}

const bundle = async () => {
    const products = Object.values(state.products).flat();
    console.log('final.length', products.length);
    await writeFile('products.json', products);
}

const runProduct = async () => {
    await createProducts(true);
    console.log('----------------------- done -----------------------');
    console.log(Object.keys(state.products));
    await bundle();
}

runProduct();

module.exports.runProduct = runProduct;