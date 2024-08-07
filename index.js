import * as fs from 'fs';
import * as path from 'path';
import { dryrun, message, createDataItemSigner, result } from '@permaweb/aoconnect';
import readline from 'readline';

const srcDir = path.resolve('src');
const aoDir = path.join(srcDir, 'ao');
const outputDir = path.resolve('dist');
const outputFile = path.join(outputDir, 'process.lua');
const wallet = JSON.parse(fs.readFileSync(path.resolve('src/wallet.json')).toString())
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function findLuaFiles(dir){
    console.log('------------------ Searching for lua files ------------------')
    let luaFiles = [];
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                luaFiles = luaFiles.concat(findLuaFiles(fullPath));
            } else if (file.endsWith('.lua')) {
                luaFiles.push(fullPath);
            }
        }
    }
    return luaFiles;
}

function concatenateFiles(luaFiles, outputFile) {
    console.log('------------------ Concatenating lua files ------------------')
    const writeStream = fs.createWriteStream(outputFile, { flags: 'w' });
    luaFiles.forEach(file => {
        const data = fs.readFileSync(file, 'utf8');
        writeStream.write(data + '\n');
    });
    writeStream.end();
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

ensureDir(outputDir);

async function getProject() {
    /*const { Output } = await dryrun({
        process: "o6hC3QWuKrM2epuufJn5RDMSJKaLigyk90D7E8qUheU",
        tags: [{name: "Action", value: "Get"}]
    })
    const userAddress = useUserInfoStore().getAddress
    const transformedResult = JSON.parse(Output.data)*/
    let processId ="LbI8OIWennABkB551360w-wY5LmdXrvwTLATdCQE9R8"
    rl.question('Enter your deployment message', async(name) => {
        rl.close();
    
    const processContent = fs.readFileSync(outputFile, 'utf8')
    const messageId = await message({
        process: processId,
        signer: createDataItemSigner(wallet),
        tags: [{ name: 'Action', value: 'Eval' }],
        data: JSON.stringify(processContent)
    });
    const {Messages, Output:output} =await result({
        process: processId,
        message:messageId
    });
    if (output.data.json !== 'undefined') {
        console.error('\x1b[31m%s\x1b[0m','------Not allowed to push to this project ----')
        return
    }
    console.log('\x1b[32m%s\x1b[0m','------------------ Deployment successful -------------------')
    await message({
        process: "o6hC3QWuKrM2epuufJn5RDMSJKaLigyk90D7E8qUheU",
        signer: createDataItemSigner(wallet),
        tags: [{ name: 'Action', value: 'Deploy' }, { name: 'Commit', value: name }, { name: 'Process', value: processId }],
    });
    }); 
}

const luaFiles = findLuaFiles(aoDir);
if (luaFiles.length > 0) {
    concatenateFiles(luaFiles, outputFile);
    console.log(`Successfully concatenated ${luaFiles.length} lua files into ${outputFile}`);
    getProject()
} else {
    console.log(`No lua files found in the directory: ${aoDir}`);
    console.log('-------------------------- End --------------------------')
}
