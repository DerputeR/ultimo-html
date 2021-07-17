const output = document.querySelector("#output")
const input = document.querySelector("#cmd")
let intervals = []
let queue = []
let commands = []
let persistentDivs = []

input.addEventListener("keypress", (e) => {
    if (e.keyCode == 13 || e.key == "Enter") {
        if (input.value.length > 0) {
            parseInput(input.value);
            input.value = "";
        }
        else {
            forceOutQueue();
        }
    }
});

const str_test = [
    "Hello.",
    "This is a test of the string print output.",
    "I'm not sure how well this will work",
    "<span class=\"hint\">Let's find out.</span>"
]

class Dialog {
    constructor(text="", delay=0, interval=0, persist=false) {
        this.text = text;
        this.delay = delay;
        this.interval = interval;
        this.persist = persist;
    }
}

class Command {
    constructor(cmd, func) {
        this.cmd = cmd.trim().toLowerCase();
        this.func = func;
        this.args = arguments;
    }
    execute() {
        this.func.apply(this, this.args);
    }
}

class QueueItem {
    constructor(diagArr=[], divArr=[], timerArr=[]) {
        this.diagArr = diagArr;
        this.divArr = divArr;
        this.timerArr = timerArr;
    }    
}

const dialog_test = [
    new Dialog("Hello.", 100),
    new Dialog("This is a test of the string print output.", 50, 1000),
    new Dialog("I'm not sure how well this will work", 20, 500),
    new Dialog("<span class=\"hint\">Let's find out.</span>", 200, 1500)
]
const dialog_test2 = [
    new Dialog("Hello.", 0, 0),
    new Dialog("This is a test of the string print output.", 0, 0),
    new Dialog("I'm not sure how well this will work", 0, 0),
    new Dialog("<span class=\"hint\">Let's find out.</span>", 10, 100)
]

function clearOutput(clearpersistent=false) {
    const outDivs = output.childNodes;
    forceOutQueue();
    for (let i = outDivs.length - 1; i >= 0; i--) {
        output.removeChild(outDivs[i])
        console.log()
    }
    if (clearpersistent) {
        persistentDivs = [];
    }
    else{
        persistentDivs.forEach(element => {
            output.appendChild(element);
        });
    }
}

function persistOutput() {
    forceOutQueue();
    persistentDivs = [];
    const get = output.childNodes;
    get.forEach(element => {
        persistentDivs.push(element.cloneNode(true));
    });
}

function start() {
    clearOutput(true);
    const dialog_start = [
        new Dialog("ultimo\n\n\n\n\n", 100, 1000, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("<span class=\"hint\">start</span> day", 100, 1000, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
    ];
    
    sendOutput(dialog_start);
    commands = [
        new Command("start", start)
    ];

}

function sendOutput(dialogArr) {
    if (queue.length > 0) {
        forceOutQueue();
    }
    let divs = [];
    for (let i = 0; i < dialogArr.length; i++) {
        div = document.createElement("div");
        output.appendChild(div);
        divs.push(div);
        if (dialogArr[i].persist) {
            persistentDivs.push(div);
        }
    }
    // typewriters(dialogArr, divs, 0);
    displayLines(dialogArr, divs);
}

function parseInput(inputStr) {
    const cmdID = findWithAttr(commands, "cmd", inputStr.toLowerCase().trim());
    if (cmdID > -1) {
        commands[cmdID].execute();
    }
    else {
        echoInput(inputStr);
    }
}

function echoInput(inputStr) {
    clearOutput(false);
    const echo = [
        new Dialog("<span class=\"echo\">> " + inputStr + "</span>", 0, 0, false),
        new Dialog("<span class=\"error\">command not found</span>", 0, 0, false)
    ]
    sendOutput(echo);
}


function forceOutQueue() {
    const event = new CustomEvent("forceOutput");
    output.dispatchEvent(event);
    queue.forEach(item => {
        item["timerArr"].forEach(timer => {
            clearInterval(timer);
            clearTimeout(timer);
        });
        for (let i = 0; i < item["diagArr"].length; i++) {
            item["divArr"][i].innerHTML = item["diagArr"][i].text;
        }
    });
    queue = [];
}


function displayLines(diags, divs) {
    queueItem = new QueueItem(diags, divs, []);
    queue.push(queueItem);
    recursiveLine(diags, divs, 0, 0, queueItem);
}

function recursiveLine(diags, divs, row, charIndex, queueItem) {
    let queuePos = queue.indexOf(queueItem);
    let p = displayPromise(diags, divs, row, charIndex, queuePos);
    console.log(p);
    p.then(()=>{
        charIndex = 0;
        ++row;
        if (row < diags.length) {
            recursiveLine(diags, divs, row, charIndex, queueItem);
        }
        else {
            console.log("finished item");
            queuePos = queue.indexOf(queueItem); // Update in case indices changed from prior removal
            queue.splice(queuePos, 1);
        }
    }).catch(()=>{
        console.log("forcing output");
    });
}

const displayPromise = (diags, divs, row, charIndex, queuePos) => {
    return new Promise((resolve, reject) => {
        const str = diags[row].text;
        if (diags[row].interval > 0) {
            const timeout = setTimeout(() => {
                if (diags[row].delay > 0) {
                    let timer = setInterval(()=>{
                        let char = str[charIndex];
                        if (char === "<") {
                            charIndex = str.indexOf(">", charIndex); // skip to end of tag
                        }
                        divs[row].innerHTML = str.slice(0, charIndex+1);
                        if (++charIndex >= str.length) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, diags[row].delay);
                    queue[queuePos]["timerArr"].push(timer);
                    const e = document.createElement("span");
                    e.className = "empty";
                    output.appendChild(e);
                    e.addEventListener("forceOutput", function cancel() {
                        e.removeEventListener("forceOutput", cancel);
                        output.removeChild(e);
                        reject();
                    });
                }
                else {
                    divs[row].innerHTML = str;
                    resolve();
                }
            }, diags[row].interval);
            queue[queuePos]["timerArr"].push(timeout);
        }
        else {
            divs[row].innerHTML = str;
            resolve();
        }
    });
};

// Adopted from https://stackoverflow.com/questions/7176908/how-can-i-get-the-index-of-an-object-by-its-property-in-javascript
function findWithAttr(array, attr, value) {
    if (array.length < 1) return -1;
    for (let i = 0; i < array.length; i++) {
        try {
            if (array[i][attr] === value) {
                return i;
            }
        }
        catch { // if doesn't exist
            return -1;
        }
    }
    return -1;
}


document.addEventListener("keypress", ()=>{
    input.focus();
    output.scrollTop = output.scrollHeight;
});


start();
