class db {
    constructor(directory, maxSize = 1000) {
        this.directory = directory;
        this.maxSize = maxSize; // Taille maximale d'un fichier en nombre d'entrées
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }
        this.index = 0; // Index de la partition courante
        this._loadIndex();
    }

    _loadIndex() {
        const files = fs.readdirSync(this.directory).filter(file => file.endsWith('.json'));
        this.index = files.length ? Math.max(...files.map(file => parseInt(file, 10))) : 0;
    }

    _getFilePath(index) {
        return path.join(this.directory, `${index}.json`);
    }

    _loadContent(index) {
        const filePath = this._getFilePath(index);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '{}');
        }
        return JSON.parse(fs.readFileSync(filePath));
    }

    _saveContent(index, content) {
        const filePath = this._getFilePath(index);
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    }

    _getPartition() {
        let content = this._loadContent(this.index);
        if (Object.keys(content).length >= this.maxSize) {
            this.index += 1;
            content = {};
        }
        return { index: this.index, content };
    }

    _savePartition(index, content) {
        this._saveContent(index, content);
    }

    has(key) {
        for (let i = 0; i <= this.index; i++) {
            const content = this._loadContent(i);
            if (key in content) {
                return true;
            }
        }
        return false;
    }

    get(key) {
        for (let i = 0; i <= this.index; i++) {
            const content = this._loadContent(i);
            if (key in content) {
                return content[key];
            }
        }
        return undefined;
    }

    set(key, value) {
        const { index, content } = this._getPartition();
        content[key] = value;
        this._savePartition(index, content);
    }

    remove(key) {
        for (let i = 0; i <= this.index; i++) {
            const content = this._loadContent(i);
            if (key in content) {
                delete content[key];
                this._saveContent(i, content);
                return;
            }
        }
    }

    find(value) {
        let result = [];
        for (let i = 0; i <= this.index; i++) {
            const content = this._loadContent(i);
            for (let key in content) {
                if (content[key] === value) {
                    result.push(key);
                }
            }
        }
        return result;
    }

    count() {
        let count = 0;
        for (let i = 0; i <= this.index; i++) {
            const content = this._loadContent(i);
            count += Object.keys(content).length;
        }
        return count;
    }

    // Méthode pour récupérer tout le contenu de la DB
    getAll() {
        let allContent = {};
        for (let i = 0; i <= this.index; i++) {
            const content = this._loadContent(i);
            allContent = { ...allContent, ...content };
        }
        return allContent;
    }

    // Méthode pour importer des données d'un autre fichier
    importData(file) {
        if (fs.existsSync(file)) {
            const data = JSON.parse(fs.readFileSync(file));
            for (let key in data) {
                this.set(key, data[key]);
            }
        } else {
            throw new Error('File does not exist');
        }
    }
    exportData(file){
        fs.writeFileSync(file,JSON.stringify(this.getAll(),null,4))
    }
    purge=()=>{
        Object.keys(this.getAll()).map((item)=>{this.remove(item)})
    }
}
class sgdb{

    /**
    * Constructs a new instance of the class.
    *
      * @param {string} dir - The directory path.
      */
 
     constructor(dir){
         this.dir=dir
         if(!fs.existsSync(dir)){
             fs.mkdirSync(dir)
         }
         this.db={}
         this.dblist=fs.readdirSync(dir)
         for(let i=0;i<this.dblist.length;i++){
             this.addddb(this.dblist[i].split('.')[0])
         }
     }
     addddb(name,n){
         this.db[name]=new db(`${this.dir}/${name}`,n)
     }
     removedb(name){
         delete this.db
         this.db={}
         fs.unlinkSync(`${this.dir}/${name}.json`)
         this.dblist=fs.readdirSync(this.dir)
         for(let i=0;i<this.dblist.length;i++){
             this.addddb(this.dblist[i].split('.')[0])
         }
     }
     accessdb(name){
         return this.db[name]
     }
     listdb(){
         return this.dblist
     }
 }

// Création d'une instance de sgdb avec le répertoire 'mod'
const dbManager = new sgdb('mod');

// Importation de tous les fichiers JSON dans le répertoire 'mod'
fs.readdirSync('mods').forEach(file => {
    if (file.endsWith('.json')) {
        dbManager.addddb("main").importData(`./mods/${file}`);
       
    }
});

// Exportation de la base de données
dbManager.addddb('main').exportData('./mod.json');

// Génération du fichier index.html avec EJS
const ejs = require('ejs');
const template = fs.readFileSync('index.ejs', 'utf8');
const data = {
    mods: dbManager.db
};
const html = ejs.render(template, data);
fs.writeFileSync('index.html', html);