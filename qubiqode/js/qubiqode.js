
/* =================================
   QUBIQODE - MAIN JAVASCRIPT
================================= */


/* =================================
   DOM ELEMENTS
================================= */

const languageSelect =
    document.getElementById("language-select");

const editorContainer =
    document.getElementById("code-editor");

const runButton =
    document.getElementById("run-button");

const resetButton =
    document.getElementById("reset-button");

const clearInputButton =
    document.getElementById("clear-input-button");

const clearOutputButton =
    document.getElementById("clear-output-button");

const stdinInput =
    document.getElementById("stdin-input");

const outputConsole =
    document.getElementById("output-console");

const editorLanguageLabel =
    document.getElementById("editor-language-label");

const executionStatus =
    document.getElementById("execution-status");


/* =================================
   LANGUAGE CONFIGURATION
================================= */

const languageConfig = {

    java: {
        label: "JAVA",
        monacoLanguage: "java",

        starterCode: `public class Main {

    public static void main(String[] args) {

        System.out.println("Hello, Qubiqode!");

    }

}`
    },

    python: {
        label: "PYTHON",
        monacoLanguage: "python",

        starterCode: `print("Hello, Qubiqode!")`
    },

    javascript: {
        label: "JAVASCRIPT",
        monacoLanguage: "javascript",

        starterCode: `console.log("Hello, Qubiqode!");`
    },

    cpp: {
        label: "C++",
        monacoLanguage: "cpp",

        starterCode: `#include <iostream>
using namespace std;

int main() {

    cout << "Hello, Qubiqode!" << endl;

    return 0;

}`
    }

};


/* =================================
   EDITOR VARIABLES
================================= */

let editor = null;

let currentLanguage = "java";


/* =================================
   LOAD MONACO EDITOR
================================= */

require.config({

    paths: {

        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs"

    }

});


require(["vs/editor/editor.main"], function () {

    editor = monaco.editor.create(editorContainer, {

        value: languageConfig.java.starterCode,

        language: "java",

        theme: "vs-dark",

        automaticLayout: true,

        fontSize: 14,

        minimap: {
            enabled: false
        },

        scrollBeyondLastLine: false,

        wordWrap: "on",

        tabSize: 4,

        insertSpaces: true,

        lineNumbers: "on",

        roundedSelection: false

    });

    executionStatus.textContent = "Ready to code";

});


/* =================================
   LANGUAGE SWITCHING
================================= */

languageSelect.addEventListener("change", function () {

    const selectedLanguage = this.value;

    currentLanguage = selectedLanguage;

    const config = languageConfig[selectedLanguage];

    if (!config || !editor) {
        return;
    }

    editor.setValue(config.starterCode);

    monaco.editor.setModelLanguage(
        editor.getModel(),
        config.monacoLanguage
    );

    editorLanguageLabel.textContent = config.label;

    outputConsole.textContent =
        "Language changed to " + config.label + ".";

    executionStatus.textContent = "Ready to code";

});


/* =================================
   RESET EDITOR
================================= */

resetButton.addEventListener("click", function () {

    if (!editor) {
        return;
    }

    const config = languageConfig[currentLanguage];

    editor.setValue(config.starterCode);

    outputConsole.textContent =
        "Editor restored to default code.";

    executionStatus.textContent = "Ready to code";

});


/* =================================
   CLEAR INPUT
================================= */

clearInputButton.addEventListener("click", function () {

    stdinInput.value = "";

});


/* =================================
   CLEAR OUTPUT
================================= */

clearOutputButton.addEventListener("click", function () {

    outputConsole.textContent = "";

    executionStatus.textContent = "Ready to code";

});


/* =================================
   RUN CODE
================================= */

runButton.addEventListener("click", function () {

    outputConsole.textContent =
        "Execution service is not connected yet.";

    executionStatus.textContent =
        "Waiting for execution backend";

});


/* =================================
   EDITOR KEYBOARD SHORTCUTS
================================= */

document.addEventListener("keydown", function (event) {

    if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter"
    ) {

        event.preventDefault();

        runButton.click();

    }

});
