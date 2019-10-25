function canIUseIndexedDB() {
  return "indexedDB" in window;
}

const KB = 1024;
const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

const DATABASE_NAME = "cs-storage-demo";
const DATABASE_VERSION = 2;
let db = null;
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
      let request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      // 监听错误事件
      request.onerror = event => {
        console.error("open error", event);
        this.showError(event.target.error.message);
      };
      // 监听成功事件，这里可以获得db实例
      request.onsuccess = event => {
        console.log("open success");
        db = event.target.result;
        // 设置Database事件

        // 监听数据库事务abort事件
        db.addEventListener("abort", event => {
          console.log("db transaction aborted", event);
        });
        // 监听数据库close事件
        db.addEventListener("close", event => {
          console.log("db closed", event);
        });
        // 监听数据库error事件
        db.addEventListener("error", event => {
          console.error("db error", event);
          this.showError(event.target.error.message);
        });
        // 监听数据库版本变化事件
        db.addEventListener("versionchange", event => {
          // 当有两个网页打开数据库连接时候会出现
          console.log(
            "db versionchange:",
            event.target.name,
            event.oldVersion,
            event.newVersion
          );
        });

        this.currentDatabase = { name: db.name, version: db.version };
        this.objectStoreNames = db.objectStoreNames;
        this.clearError();
        this.clearWarn();
        this.loadEstimate();
      };
      // 监听数据库升级事件，只在首次打开数据库或者版本号递增以后触发的事件
      // 在这个事件中，可以创建或删除ObjectStore，创建或删除Index
      request.onupgradeneeded = event => {
        console.log("open upgradeneeded");
        const db = event.target.result;
        // 创建ObjectStore时候需要判断是否已经存在
        if (!db.objectStoreNames.contains("patient")) {
          // 创建ObjectStore，设置ObjectStore名称和options{keyPath}
          let os = db.createObjectStore("patient", { keyPath: "patientId" });
          os.createIndex("index_by_age_and_gender", ["age", "gender"], {
            unique: false,
            multiEntry: false
          });
          os.createIndex("index_by_age", "age", { unique: false });
          os.createIndex("index_by_gender", "gender", { unique: false });

          os.transaction.oncomplete = event => {
            // 初始化数据
            let transaction = db.transaction("patient", "readwrite");
            transaction.oncomplete = event => {
              console.log("transaction ok", event);
            };
            transaction.onerror = event => {
              console.log("transaction error", event);
              this.showError(event.target.error.message);
            };
            let objectStore = transaction.objectStore("patient");
            patients.forEach(patient => {
              objectStore.add(patient);
            });
            transaction.commit();
          };
        }
        // 追加索引
        // var pos = event.target.transaction.objectStore("patient");
        // pos.createIndex("index_by_gender", "gender", { unique: false });

        if (!db.objectStoreNames.contains("message")) {
          let os = db.createObjectStore("message", {
            autoIncrement: true,
            keyPath: "messageId"
          });
          os.transaction.oncomplete = event => {
            // 初始化数据
            let transaction = db.transaction("message", "readwrite");
            transaction.oncomplete = event => {
              console.log("transaction ok", event);
            };
            transaction.onerror = event => {
              console.log("transaction error", event);
              this.showError(event.target.error.message);
            };
            let objectStore = transaction.objectStore("message");
            objectStore.add({ content: "Hello" });
            objectStore.add({ content: "World" });
            transaction.commit();
          };
        }
      };
      // 监听数据库升级阻塞事件，当数据库不可用或者不能用的时候触发的事件
      request.onblocked = event => {
        console.log("open blocked");
        this.showWarn("Blocked upgrade");
      };
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
      if (db) {
        let transaction = db.transaction(osName, "readonly");
        transaction.oncomplete = event => {
          console.log(event);
        };
        transaction.onerror = event => {
          console.error(event);
        };
        let objectStore = transaction.objectStore(osName);
        console.log(objectStore);
        let request = objectStore.getAll();
        request.onsuccess = event => {
          const data = event.target.result;
          if (data && data.length > 0) {
            this.columns = Object.keys(data[0]);
            this.data = data;
          }
        };
        request.onerror = event => {};
        transaction.commit();
      }
    },
    searchFemaleAndLessThan80() {
      if (db) {
        let transaction = db.transaction(
          this.currentObjectStoreName,
          "readonly"
        );
        transaction.oncomplete = event => {
          console.log(event);
        };
        transaction.onerror = event => {
          console.error(event);
        };
        let objectStore = transaction.objectStore(this.currentObjectStoreName);
        let index = objectStore.index("index_by_age_and_gender");
        // var range = IDBKeyRange.only([10, "F"]);
        console.log(indexedDB.cmp([30, "M"], [80, "F"]));
        var range = IDBKeyRange.bound([0, "F"], [80, "F"], true, true);
        let request = index.getAll(range);
        request.onsuccess = event => {
          console.log(event);
          const data = event.target.result;
          if (data && data.length > 0) {
            this.columns = Object.keys(data[0]);
            this.data = data;
          }
        };
        request.onerror = event => {};
        transaction.commit();
      }
    },
    searchLessThan30() {
      if (db) {
        let transaction = db.transaction(
          this.currentObjectStoreName,
          "readonly"
        );
        transaction.oncomplete = event => {
          console.log(event);
        };
        transaction.onerror = event => {
          console.error(event);
        };
        let objectStore = transaction.objectStore(this.currentObjectStoreName);
        let index = objectStore.index("index_by_age");
        let range = IDBKeyRange.upperBound(30, true);
        let request = index.getAll(range);
        request.onsuccess = event => {
          console.log(event);
          const data = event.target.result;
          if (data && data.length > 0) {
            this.columns = Object.keys(data[0]);
            this.data = data;
          }
        };
        request.onerror = event => {};
        transaction.commit();
      }
    },
    searchMale() {
      if (db) {
        let transaction = db.transaction(
          this.currentObjectStoreName,
          "readonly"
        );
        transaction.oncomplete = event => {
          console.log(event);
        };
        transaction.onerror = event => {
          console.error(event);
        };
        let objectStore = transaction.objectStore(this.currentObjectStoreName);
        let index = objectStore.index("index_by_gender");
        let range = IDBKeyRange.only("M");
        let request = index.openCursor(range, "next");
        this.data = [];
        request.onsuccess = event => {
          let cursor = event.target.result;
          this.data.push(cursor.value);
          cursor.continue();
        };
        request.onerror = event => {
          console.error("opencursor error", event);
          this.showError(event.target.error.message);
        };
      }
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
    loadEstimate() {
      if (navigator.storage) {
        navigator.storage.estimate().then(se => {
          this.storageEstimate = { usage: se.usage, quota: se.quota };
        });
      }
    }
  }
});
