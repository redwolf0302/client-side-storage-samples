function canIUseIndexedDB() {
  return "indexedDB" in window;
}

const KB = 1024;
const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

const DATABASE_NAME = "cs-storage-demo-dexie";
const DATABASE_VERSION = 1;
let db = new Dexie(DATABASE_NAME);
var vm = new Vue({
  el: "#app",
  data: {
    canIUseIndexedDB: canIUseIndexedDB(),
    objectStoreNames: null,
    currentObjectStoreName: null,
    currentDatabase: null,
    columns: [],
    data: [],
    hasError: false,
    errorMessage: null,
    hasWarn: false,
    warnMessage: null,
    storageEstimate: { usage: 0, quota: 0 }
  },
  created() {
    // 创建或者打开数据库
    if (canIUseIndexedDB()) {
      db.version(DATABASE_VERSION).stores({
        patient: "patientId,age,gender,[age+gender]"
      });
      this.currentDatabase = { name: db.name, version: db.verno };
      let tableNames = [];
      db.tables.reduce((p, c) => {
        p.push(c.name);
      }, tableNames);
      this.objectStoreNames = tableNames;
      this.loadEstimate();
    }
  },
  watch: {
    currentObjectStoreName: "loadObjectStore"
  },
  methods: {
    showError(errorMessage) {
      this.hasError = true;
      this.errorMessage = errorMessage;
    },
    clearError() {
      this.hasError = false;
    },
    showWarn(warnMessage) {
      this.hasWarn = true;
      this.warnMessage = warnMessage;
    },
    clearWarn() {
      this.hasWarn = false;
    },
    selectObjectStore(objectStoreName) {
      this.currentObjectStoreName = objectStoreName;
    },
    loadObjectStore(osName) {
      db.table(osName)
        .toArray()
        .then(data => {
          if (data && data.length > 0) {
            this.columns = Object.keys(data[0]);
            this.data = data;
          }
        });
    },
    searchFemaleAndLessThan80() {
      db.table(this.currentObjectStoreName)
        .where("[age+gender]")
        .below([80, "F"])
        .sortBy("patientId")
        .then(data => {
          if (data && data.length > 0) {
            this.columns = Object.keys(data[0]);
            this.data = data;
          }
        });
    },
    searchLessThan80() {
      db.table(this.currentObjectStoreName)
        .where("age")
        .below(80)
        .sortBy("patientId")
        .then(data => {
          if (data && data.length > 0) {
            this.columns = Object.keys(data[0]);
            this.data = data;
          }
        });
    },
    calcStorageSize(size) {
      if (size > GB) {
        return `${(size / GB).toFixed(4)}GB`;
      } else if (size > MB) {
        return `${(size / MB).toFixed(4)}MB`;
      } else if (size > KB) {
        return `${(size / KB).toFixed(4)}KB`;
      } else {
        return `${size}KB`;
      }
    },
    importData() {
      db.patient.bulkAdd(patients);
    },
    loadEstimate() {
      if (navigator.storage) {
        navigator.storage.estimate().then(se => {
          this.storageEstimate = { usage: se.usage, quota: se.quota };
        });
      }
    }
  }
});
