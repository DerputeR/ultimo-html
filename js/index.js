const output = document.querySelector("#output")
const input = document.querySelector("#cmd")
let intervals = []
let queue = []
let commands = []

input.addEventListener("keypress", (e) => {
    if (e.keyCode == 13 || e.key == "Enter") {
        if (input.value.length > 0) {
            parseInput(input.value);
            input.value = "";
        }
    }
});

const str_test = [
    "Hello.",
    "This is a test of the string print output.",
    "I'm not sure how well this will work",
    "<b>Let's find out.</b>"
]

class Dialog {
    constructor(text="", delay=0, interval=0) {
        this.text = text;
        this.delay = delay;
        this.interval = interval;
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
    new Dialog("<b>Let's find out.</b>", 200, 1500)
]
const dialog_test2 = [
    new Dialog("Hello.", 0, 0),
    new Dialog("This is a test of the string print output.", 0, 0),
    new Dialog("I'm not sure how well this will work", 0, 0),
    new Dialog("<b>Let's find out.</b>", 10, 100)
]

function clearOutput() {
    const outDivs = output.childNodes;
    for (let i = outDivs.length - 1; i >= 0; i--) {
        output.removeChild(outDivs[i])
    }

    for (let i = intervals.length - 1; i >= 0; i--) {
        clearInterval(intervals[i]);
        intervals.pop()
    }
}

function start() {
    clearOutput();
    const dialog_start = [
        new Dialog("ultimo\n\n\n\n\n", 100, 1000),
        new Dialog(""),
        new Dialog(""),
        new Dialog(""),
        new Dialog(""),
        new Dialog(""),
        new Dialog("<u>start</u> day", 100, 1000)
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
    const echo = [
        new Dialog("<echo>> " + inputStr + "</echo>", 0, 0),
        new Dialog("<err>command not found</err>", 0, 0)
    ]
    sendOutput(echo);
    // forceOutQueue();
}


// adopted from https://stackoverflow.com/questions/29462305/how-to-create-a-typewriter-effect-in-javascript-that-will-take-into-account-html/29462670
// function typewriter(delay, div, str) {
//     let i = 0;
//     let timer = setInterval(() => {
//         const char = str[i];
//         if (char === "<") {
//             i = str.indexOf(">", i); // skip to end of tag
//         }

//         div.innerHTML = str.slice(0, i+1);

//         if (++i >= str.length) {
//             clearInterval(timer);
//             console.log('done');
//             const e = new CustomEvent('lineDone');
//             output.dispatchEvent(e);
//         }
//     }, delay);
//     intervals.push(timer);
// }

function forceOutQueue() {
    const event = new CustomEvent("forceOutput");
    output.dispatchEvent(event);
    queue.forEach(item => {
        item["timerArr"].forEach(timer => {
            clearInterval(timer);
        });
        for (let i = 0; i < item["diagArr"].length; i++) {
            item["divArr"][i].innerHTML = item["diagArr"][i].text;
        }
    });
    queue = [];
}

function typewriters(diags, divs, r, q=-2) {
    let c = 0;
    let spot = intervals.length;
    if (q == -2) {
        q = findWithAttr(queue, "diagArg", diags);
        if (q === -1) {
            let item = new QueueItem(diags, divs, []);
            q = queue.length;
            queue.push(item);
        }
    }
    let timer = setInterval(() => {
        let spo = queue[q]["timerArr"].indexOf(timer);
        let str = diags[r].text;
        const char = str[c];
        if (char === "<") {
            c = str.indexOf(">", c); // skip to end of tag
        }

        divs[r].innerHTML = str.slice(0, c+1);

        if (++c >= str.length) {
            {
                if (++r >= diags.length) { // When all lines are done
                    clearInterval(timer);
                    intervals.splice(spot, 1);
                    queue.splice(q, 1);
                }
                else { // When current line is done
                    clearInterval(timer);
                    intervals.splice(spot, 1);
                    queue[q]["timerArr"].splice(spo, 1);
                    setTimeout(()=>{
                        typewriters(diags, divs, r, q);
                    }, diags[r].interval);
                }
            }
        }
    }, diags[r].delay);
    intervals.push(timer);
    queue[q]["timerArr"].push(timer);  
    // console.log(queue);  
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
            setTimeout(() => {
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
                    const e = document.createElement("empty");
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

start()