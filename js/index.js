const output = document.querySelector("#output");
const input = document.querySelector("#cmd");
const version = "v0.3b";
let queue = [];
let commands = [];
let persistentDivs = [];
let gameTimer = -10;

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

class Dialog {
    constructor(text="", delay=0, interval=0, persist=false, newline=true) {
        this.text = text;
        this.delay = delay;
        this.interval = interval;
        this.persist = persist;
        this.newline = newline;
    }
}

class Command {
    constructor(cmd, func) {
        this.cmd = cmd.trim().toLowerCase();
        this.func = func;
        this.args = arguments;
    }
    execute() {
        clearTimeout(gameTimer);
        this.func.apply(this, this.args);
    }
}

/**
 * Global commands
 */
 const _globalCommands = [new Command("help", help), new Command("clear", () => {clearOutput()})]
 let globalCommands = _globalCommands.slice();

class QueueItem {
    constructor(diagArr=[], divArr=[], timerArr=[]) {
        this.diagArr = diagArr;
        this.divArr = divArr;
        this.timerArr = timerArr;
    }    
}

const dialog_test = [
    new Dialog("Hello.", 100, 0, true),
    new Dialog(" This is a test of the string print output.", 50, 1000),
    new Dialog("\nI'm not sure how well this will work", 20, 500),
    new Dialog("\n<span class=\"hint\">Let's find out.</span>", 100, 500)
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

    output.scrollTop = output.scrollHeight;
}

function parseInput(inputStr) {
    const cmdID = findWithAttr(commands, "cmd", inputStr.toLowerCase().trim());
    const gCmdID = findWithAttr(globalCommands, "cmd", inputStr.toLowerCase().trim());
    if (cmdID > -1) {
        commands[cmdID].execute();
        globalCommands = _globalCommands.slice(); // reset any weird changes
    }
    else if (gCmdID > -1) {
        echoInput(inputStr, false);
        globalCommands[gCmdID].execute();
    }
    else {
        echoInput(inputStr);
    }
}

function echoInput(inputStr, err=true) {
    // clearOutput(false);
    const echo = [
        new Dialog("<span class=\"echo\">> " + inputStr + "</span>", 0, 0, false)
    ]
    if (err) echo.push(new Dialog("<span class=\"error\">command not found</span>", 0, 0, false));
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


/**
 * Story and commands
 */

 function help(loop=false) {
    // persistOutput();
    const dialog_help = [
        new Dialog("look out for <span class='hint'>hints</span>", 100, 0, false)
    ]
    sendOutput(dialog_help);
    // persistOutput();
    globalCommands = _globalCommands.slice();
    globalCommands.push(new Command("hints", hints));
}

function hints() {
    // persistOutput();
    const dialog_help = [
        new Dialog("they may be of <span class='hint'>help</span>", 100, 0, false)
    ]
    sendOutput(dialog_help);
    // persistOutput();
    globalCommands = _globalCommands.slice();
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
        new Command("start", story_day1),
        new Command("version", ()=>{
            sendOutput([new Dialog(version, 100, 0, true)]);
        })
    ];
}

function story_day1() {
    clearOutput(true);
    commands = [];
    let clock = ["t-72:00:00", "t-71:00:59", "t-71:00:58", "t-71:00:57", ""]
    let i = 0;
    const inter = setInterval(()=>{
        clearOutput(true);
        sendOutput([new Dialog(clock[i], 0, 0, true)]);
        ++i;
        if (i >= clock.length) {
            clearOutput(true);
            clearInterval(inter);
            setTimeout(story_day1_a, 1000);
        }
    }, 1000);
}

function story_day1_a() {
    clearOutput(true);
    const dia = [
        new Dialog("you've got a busy day today", 15, 500, true),
        new Dialog("you arrived early at the office", 15, 1000, true),
        new Dialog("you've been hearing <span class='hint'>murmurs</span>", 15, 1500, true),
        new Dialog("you're not sure what they're saying", 15, 1500, true),
        new Dialog("", 100, 1000, true),
        new Dialog("you've got <span class='hint'>work</span> to do before going home tonight", 15, 1000, true)
    ];
    sendOutput(dia);
    commands = [
        new Command("murmurs", story_day1_murmurs),
        new Command("work", story_day1_work),
    ];

    gameTimer = setTimeout(story_day1_work, 30000); // 30 seconds before you go default path
}

function story_day1_murmurs() {
    clearOutput(true);
    const dia = [
        new Dialog("you overhear them saying <span class='hint'>something</span> about the moon", 15, 500, true),
        new Dialog("you saw on the weather yesterday that it was going to be a full moon", 15, 1000, true),
        new Dialog(" ", 10, 1500, true),
        new Dialog("it doesn't really matter", 10, 0, true),
        new Dialog("", 100, 1000, true),
        new Dialog("you've got some <span class='hint'>work</span> to finish", 15, 0, true)
    ];
    sendOutput(dia);
    commands = [
        new Command("something", story_day1_something),
        new Command("work", story_day1_work),
    ];

    gameTimer = setTimeout(story_day1_work, 30000); // 30 seconds before you go default path
}

function story_day1_something() {
    clearOutput(true);
    const dia = [
        new Dialog("\"I'm sure NASA and SpaceX and all them will figure somethin' out.\"", 15, 500, true),
        new Dialog("\"Hail Mary, full of grace...\"", 30, 1000, true),
        new Dialog(" ", 10, 2000, true),
        new Dialog("you look at the time and see it's 6pm", 15, 0, true),
        new Dialog("you'll have to finish your work tomorrow.", 15, 1000, true)
    ];
    sendOutput(dia);
    commands = [];
    gameTimer = setTimeout(story_day1_somethingb, 12000);
}

function story_day1_somethingb() {
    clearOutput(true);
    const dia = [
        new Dialog("", 10, 500, true),
        new Dialog("you clock out and headed home", 10, 1000, true),
        new Dialog(" ", 10, 2000, true),
        new Dialog("the streets are eerily quiet", 10, 0, true),
        new Dialog("", 100, 2000, true),
        new Dialog("the moon looks big tonight", 10, 0, true)
    ];
    sendOutput(dia);
    commands = [];
    setTimeout(() => {
        story_day2("b");
    }, 12000);
}

function story_day1_work() {
    clearOutput(true);
    const dia = [
        new Dialog("you turn in your last assignment", 10, 500, true),
        new Dialog("you clock out and headed home", 10, 1000, true),
        new Dialog(" ", 10, 2000, true),
        new Dialog("the streets are eerily quiet", 10, 0, true),
        new Dialog("", 100, 2000, true),
        new Dialog("the moon looks big tonight", 10, 0, true)
    ];
    sendOutput(dia);
    commands = [];
    setTimeout(() => {
        story_day2("a");
    }, 12000);
}

function story_day2(path) {
    clearOutput(true);
    commands = [];
    let clock = ["t-48:00:00", "t-47:00:59", "t-47:00:58", "t-47:00:57", ""]
    let i = 0;
    const inter = setInterval(()=>{
        clearOutput(true);
        sendOutput([new Dialog(clock[i], 0, 0, true)]);
        ++i;
        if (i >= clock.length) {
            clearOutput(true);
            clearInterval(inter);
            if (path=="a") {
                setTimeout(story_day2a, 1000);
            }
            else {
                setTimeout(story_day2b, 1000);
            }
        }
    }, 1000);
}

function story_day2a() {
    clearOutput(true);
    const dia = [
        new Dialog("you wake up a little late this morning.", 15, 500, true),
        new Dialog("it seems a bit overcast today.", 30, 1000, true),
        new Dialog("you don't hear any birds.", 10, 1000, true),
        new Dialog("", 15, 0, true),
        new Dialog("you think about putting in some <span class='hint'>extra hours</span> today.", 15, 2000, true),
        new Dialog("you might give your parents a surprise <span class='hint'>visit</span>", 15, 1000, true)
    ];
    sendOutput(dia);
    commands = [
        new Command("extra hours", story_day2a_work),
        new Command("visit", story_day2a_visit)
    ];
    gameTimer = setTimeout(story_day2a_work, 30000); // 30 seconds before you go default path
}

function story_day2a_work() {
    clearOutput(true);
    commands = []
    let dia = [
        new Dialog("you drive to work.", 15, 500, true),
        new Dialog("the streets are strangely empty.", 30, 2000, true),
    ];
    sendOutput(dia);
    setTimeout(() => {
        clearOutput(true);
        commands = [
            new Command("Mr. Brevi", story_day2a_brevi1)
        ];
        dia = [
            new Dialog("you arrive at the office.", 15, 500, true),
            new Dialog("there's only one car.", 30, 1000, true),
            new Dialog("", 30, 0, true),
            new Dialog("you recognize it belonging to your kind elderly supervisor, <span class='hint'>Mr. Brevi</span>", 30, 1000, true)
        ];
        sendOutput(dia);
        gameTimer = setTimeout(story_day2a_brevi1, 10000);
    }, 6000);
}

function story_day2a_brevi1() {
    clearOutput(true);
    commands = [
        new Command("Mr. Brevi", story_day2a_brevi2),
        new Command("walk", story_day2a_brevi1_walk),
    ];
    let dia = [
        new Dialog("you enter the office.", 15, 500, true),
        new Dialog("all the lights are off except for <span class='hint'>Mr. Brevi</span>'s.", 30, 2000, true),
        new Dialog("", 0, 1000, true),
        new Dialog("you <span class='hint'>walk</span> toward your cubicle", 15, 1000, true)
    ];
    sendOutput(dia);
    gameTimer = setTimeout(story_day2a_brevi1_walk, 30000);
}

function story_day2a_brevi1_walk() {
    clearOutput(true);
    commands = [
        
    ];
    let dia = [
        new Dialog("work in progress", 15, 500, true)
    ];
    sendOutput(dia);
}

function story_day2a_brevi2() {
    clearOutput(true);
    commands = [
        
    ];
    let dia = [
        new Dialog("work in progress", 15, 500, true)
    ];
    sendOutput(dia);
}

function story_day2a_visit() {
    clearOutput(true);
    commands = []
    let dia = [
        new Dialog("work in progress", 15, 500, true)
    ];
    sendOutput(dia);
}

function story_day2b() {
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("work in progress", 15, 500, true)
    ];
    sendOutput(dia);
}



start();
