const helpers = require('./helpers.js');
const asyncForEach = require('./asyncForEach.js');
const {getStoreResults} = require('./requests.js');
const {writeFile, readFile, readLargeJSON} = require('./fileManager.js');

const state = {
	stores: {},
    skus: []
}

const parsedSkusFn = async () => {
    
    const products = await readLargeJSON(true, './products.json');
	const skus = products.map(product => product.sku);
    const totalSkuRequests = Math.ceil(skus.length / helpers.skuLimit);

	for(let i = 0; i < totalSkuRequests; i++) {
		state.skus[i] = skus.slice(i * helpers.skuLimit,  i * helpers.skuLimit + helpers.skuLimit);
    }
}

const parseStores = (storeId) => {

    let temp = [];

    state.stores[storeId].forEach((store) => {
        if(temp.findIndex(tempStore => tempStore.storeId === store.storeId) === -1) {
            temp.push(store);
        } else {
            temp.forEach(tempStore => {
                if(tempStore.storeId === store.storeId) {
                    tempStore.sku.push(...store.sku);
                }
            });
        }
    });

    state.stores[storeId] = temp;
}

const getFirstResult = (_identifier, skuChunk) => {
	return getStoreResults(_identifier, skuChunk);
}

const getResult = (stateId, skuChunk, page, isFromError = false) => {
    return new Promise(r => {
        setTimeout(async() => {
            await getStoreResults(stateId, skuChunk, page).then(response => {

                if(response.data.totalPages === 0){
                    return;
                }

                const storeChunk = response.data.stores.map(store => ({
                    storeName: store.name.toLowerCase(),
                    lat: store.lat,
                    long: store.lng,
                    city: store.city,
                    state: store.region,
                    storeId: store.storeId,
                    objecttype: 'store',
                    sku: store.products.map(product => product.sku.toString()),
                    address: store.address,
                    hours: store.hours
                }));

                if(isFromError) 
                    console.log('success FROM ERROR in N result request');
                else
                    console.log('success in N result request');

                state.stores[stateId].push(...storeChunk);
            })
            .catch(async(error) => {
                if (error.response) {
                    console.log('Error for N result');
                    console.log('error.response.status', error.response.status);

                    if(error.response.status === 403){
                        await getResult(stateId, skuChunk, page, true).then(() => {
                            console.log('ran getResult again.');
                        });
                    }
                    else
                        console.log('error 403', error);
                } 
                else 
                    console.log('error NOT respinse', error);
            });
            r();
        }, helpers.requestCallLimit);
    });
}

const getAllSkusResults = async (stateId, skuChunk, response) => {
    const start = response.data.currentPage;
    const end = response.data.totalPages + 1;

    for(let i = start; i < end; i++) {
        await getResult(stateId, skuChunk, i);
	}
}

const createStoreBySkuChunk = (stateId, skuChunk, isFromError = false) => {
    return new Promise(r => {
        setTimeout(async () => {
            await getFirstResult(stateId, skuChunk).then(
                
                async(response) => {
                    if(response.data.totalPages === 0){
                        // console.log('response.data.totalPages === 0', response.data.totalPages === 0);
                        return;
                    }

                    if(isFromError) 
                        console.log('success FROM ERROR');
                    else
                        console.log('success in FIRST request');

                    await getAllSkusResults(stateId, skuChunk, response);
                }
            )
            .catch(async(error) => {
                if (error.response) {
                    console.log('Error for FIRST result');
                    console.log('error.response.status', error.response.status);

                    if(error.response.status === 403){
                        await createStoreBySkuChunk(stateId, skuChunk, true).then(() => {
                            console.log('ran createStoreBySkuChunk again.');
                        });
                    }
                    else
                        console.log('error 403', error);
                } 
                else
                    console.log('error NOT response', error);
            });
            r();
            
        }, helpers.requestCallLimit);
    })
};

const createStores = async (fileRead) => {

    if(fileRead){
        state.stores = await readLargeJSON(false, 'pre-stores.json');
    }

    await asyncForEach(helpers.states, async (stateId) => {

        console.log('state', stateId);

        if(state.stores[stateId]) {
            console.log('state is already in!');
           return;
        }

        state.stores[stateId] = [];
        
        await asyncForEach(state.skus, async (skuChunch) => {
            await createStoreBySkuChunk(stateId, skuChunch);
        });

        parseStores(stateId);

        await writeFile('pre-stores.json', state.stores);
        console.log('state.stores', Object.values(state.stores).flat());
    });
};

const bundle = async () => {
    const final = await readLargeJSON(false, 'pre-stores.json');

    const stores = Object.values(final).flat();

    console.log('stores.length', stores.length);

    stores.push(fakeStore());

    console.log('stores.length', stores.length);

    await writeFile('stores.json', stores);
}

const fakeStore = () => {
    return {
        storeName: "Narnia",
        lat: 0,
        long: 0,
        city: "Narnia",
        state: "XX",
        storeId: "9999999",
        objecttype: 'store',
        sku: state.skus.flat(),
        address: '1234 Heaven'
    }
};

const run = async () => {
    
    await parsedSkusFn();
    await createStores(true);

    console.log('states done', Object.keys(state.stores));
    await bundle();

    console.log('states done', Object.keys(state.stores));
}

run();

module.exports.runStore = run;