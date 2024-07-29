var editor; //monaco editor
var issocket = false; // Avoid conflict between editor change event and socket change event
var isadmin = false; // Administrator
var users = {}; //user
var contentWidgets = {}; //save monaco editor name contentWidgets - monaco editor
var decorations = {}; //save monaco editor cursor or selection decorations - monaco editor
/* monaco editor with cdn */
require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.13.1/min/vs",
  },
});
window.MonacoEnvironment = {
  getWorkerUrl: function (workerId, label) {
    return `data:text/javascriptcharset=utf-8,${encodeURIComponent(`
        self.MonacoEnvironment = {
          baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.13.1/min'
        }
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.13.1/min/vs/base/worker/workerMain.js')`)}`;
  },
};

function insertCSS(id, color) {
  var style = document.createElement("style");
  style.type = "text/css";
  style.innerHTML += "." + id + " { background-color:" + color + "}\n";
  style.innerHTML += `
    .${id}one { 
        background: ${color};
        width:2px !important 
    }`;
  document.getElementsByTagName("head")[0].appendChild(style);
}

function insertWidget(e) {
  contentWidgets[e.user] = {
    domNode: null,
    position: {
      lineNumber: 0,
      column: 0,
    },
    getId: function () {
      return "content." + e.user;
    },
    getDomNode: function () {
      if (!this.domNode) {
        this.domNode = document.createElement("div");
        this.domNode.innerHTML = e.user;
        this.domNode.style.background = e.color;
        this.domNode.style.color = "black";
        this.domNode.style.opacity = 0.8;
        this.domNode.style.width = "max-content";
      }
      return this.domNode;
    },
    getPosition: function () {
      return {
        position: this.position,
        preference: [
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
          monaco.editor.ContentWidgetPositionPreference.BELOW,
        ],
      };
    },
  };
}

function changeWidgetPosition(e) {
  contentWidgets[e.user].position.lineNumber = e.selection.endLineNumber;
  contentWidgets[e.user].position.column = e.selection.endColumn;

  editor.removeContentWidget(contentWidgets[e.user]);
  editor.addContentWidget(contentWidgets[e.user]);
}

function changeSeleciton(e) {
  var selectionArray = [];
  if (
    e.selection.startColumn == e.selection.endColumn &&
    e.selection.startLineNumber == e.selection.endLineNumber
  ) {
    e.selection.endColumn++;
    selectionArray.push({
      range: e.selection,
      options: {
        className: `${e.user}one`,
        hoverMessage: {
          value: e.user,
        },
      },
    });
  } else {
    selectionArray.push({
      range: e.selection,
      options: {
        className: e.user,
        hoverMessage: {
          value: e.user,
        },
      },
    });
  }
  for (let data of e.secondarySelections) {
    if (
      data.startColumn == data.endColumn &&
      data.startLineNumber == data.endLineNumber
    ) {
      selectionArray.push({
        range: data,
        options: {
          className: `${e.user}one`,
          hoverMessage: {
            value: e.user,
          },
        },
      });
    } else
      selectionArray.push({
        range: data,
        options: {
          className: e.user,
          hoverMessage: {
            value: e.user,
          },
        },
      });
  }
  decorations[e.user] = editor.deltaDecorations(
    decorations[e.user],
    selectionArray
  );
}

function changeText(e) {
  editor.getModel().applyEdits(e.changes);
}
require(["vs/editor/editor.main"], function () {
  var htmlCode = `function hello(){
        console.log('Hello World')
    }
    
    function Change(){
        document.getElementById("child").innerText = "Do"
    }
}`;

  editor = monaco.editor.create(document.getElementById("editor"), {
    value: htmlCode,
    language: "javascript",
    fontSize: 15,
    readOnly: true,
    fontFamily: "Nanum Gothic Coding",
  });
  //Monaco Event
  editor.onDidChangeModelContent(function (e) {
    if (!issocket) {
      socket.emit("key", e);
    } else issocket = false;
  });
  editor.onDidChangeCursorSelection(function (e) {
    socket.emit("selection", e);
  });

  socket.on("connected", function (data) {
    console.log("Connected user:", data.user);
    users[data.user] = data.color;
    insertCSS(data.user, data.color);
    insertWidget(data);
    decorations[data.user] = [];
    if (isadmin) {
      editor.updateOptions({ readOnly: false });
      socket.emit("filedata", editor.getValue());
    }
  });
  socket.on("userdata", function (data) {
    if (data.length === 1) isadmin = true;
    data.forEach((user) => {
      users[user.user] = user.color;
      insertCSS(user.user, user.color);
      insertWidget(user);
      decorations[user.user] = [];
    });
  });
  socket.on("resetdata", function (data) {
    issocket = true;
    editor.setValue(data);
    editor.updateOptions({ readOnly: false });
    issocket = false;
  });
  socket.on("admin", function (data) {
    isadmin = true;
    editor.updateOptions({ readOnly: false });
  });
  socket.on("selection", function (data) {
    changeSeleciton(data);
    changeWidgetPosition(data);
  });
  socket.on("exit", function (data) {
    editor.removeContentWidget(contentWidgets[data]);
    editor.deltaDecorations(decorations[data], []);
    delete decorations[data];
    delete contentWidgets[data];
  });

  socket.on("key", function (data) {
    issocket = true;
    changeText(data);
  });
});
