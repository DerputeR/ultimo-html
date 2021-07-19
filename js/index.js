const output = document.querySelector("#output");
const input = document.querySelector("#cmd");
const timerDiv = document.querySelector("#timer");
const version = "v0.3b_01";
let queue = [];
let commands = [];
let persistentDivs = [];
let gameTimer = -10;
let gameTimerID = -10;
let gameTimerTime = 0;
let gameTimerActive = false;
let gameTimerPaused = false;
let inputEnabled = false; // Turn off until ready to accept input (failsafe for forceQueue)

/**
 * Game countdown timer
 * @param {*} timeAmt   Time in milliseconds
 * @param {*} func      Function to run after countdown reaches 0
 */
function startGameTimer(timeAmt=10000, func=undefined) {
    if (!gameTimerActive || gameTimerPaused) {
        updateGameTimerDiv();
        gameTimerTime = timeAmt;
        gameTimer = setInterval(()=>{
            if (!gameTimerPaused) {
                gameTimerTime -= 250;
                if (gameTimerTime <= 0) {
                    stopGameTimer();
                    if (func != undefined) {
                        func.apply(null);
                    }
                }
                else {
                    updateGameTimerDiv();
                }
            }
        }, 250);
        gameTimerActive = true;
        gameTimerPaused = false;
    }
}

function stopGameTimer() {
    timerDiv.removeEventListener("startTimer", handleTimerStartEvent);
    ++gameTimerID;
    if (gameTimerActive) {
        clearInterval(gameTimer);
        gameTimerTime = 0;
        updateGameTimerDiv();
        gameTimerActive = false;
        gameTimerPaused = false;
    }
} 

function pauseGameTimer() {
    if (gameTimerActive && !gameTimerPaused) {
        // clearInterval(gameTimer);
        gameTimerPaused = true;
        updateGameTimerDiv();
    }
}

function resumeGameTimer() {
    if (gameTimerActive && gameTimerPaused) {
        gameTimerPaused = false;
    }
}

function togglePauseGameTimer() {
    if (gameTimerActive && !gameTimerPaused) {
        pauseGameTimer();
    }
    else if (gameTimerActive && gameTimerPaused) {
        resumeGameTimer();
    }
}

function handleTimerStartEvent(e) {
    console.log("received id: " + e.detail.id);
    console.log("stored id: " + gameTimerID);
    // if (gameTimerID <= e.detail.id) {
    //     startGameTimer(e.detail.time, e.detail.func);
    // }
    startGameTimer(e.detail.time, e.detail.func);
}

function updateGameTimerDiv() {
    timerDiv.innerHTML = "* ".repeat(Math.ceil((gameTimerTime / 1000)));
}

input.addEventListener("keypress", (e) => {
    if (inputEnabled && (e.keyCode == 13 || e.key == "Enter")) {
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
    /**
     * Creates a command object
     * @param {String} cmd                  String of the command that will be input.
     * @param {function} func               Reference to a function that will be called on successful execution of the command
     * @param {String Array} validArgs      List of valid second words that can follow the first command (action) word.
     *                                      If empty, the command does not require a second word as a target.
     *                                      DO NOT CAPITALIZE OR INCLUDE EXTRA WHITESPACE
     * @param {int} requireArg              -2 = arg not needed, MUST NOT be given
     *                                      -1 = arg not needed, but if given, ignores validArgs
     *                                      0 = arg not needed, but if given, MUST be one in validArgs
     *                                      1 = arg is needed, MUST be one in validArgs
     *                                      2 = arg is needed, but ignores validArgs
     * @param {int} ...args                 Optional arguments passed to func. DO NOT PUT INTO AN ARRAY
     */
    constructor(cmd, func, validArgs=[], requireArg=-2, ...args) {
        this.cmd = cmd.toLowerCase().trim();
        this.func = func;
        this.validArgs = validArgs;
        this.requireArg = requireArg;
        this.extraArgs = args;
    }
    execute(arg="") {
        console.log(arg);
        if (arg == undefined) arg = "";
        const argID = this.validArgs.indexOf(arg.trim().toLowerCase());
        switch (this.requireArg) {
            case -2:
                if (arg.length > 0) {
                    sendOutput([new Dialog(`<span class='error'>'${this.cmd}' does not take any arguments</span>`)]);
                    console.warn("failed to execute case -2");
                }
                else {
                    console.log(this.extraArgs);
                    this.func.apply(this, [arg].concat(this.extraArgs));
                    console.log("executed case -2");
                }
                break;
            case -1:
                this.func.apply(this, [arg].concat(this.extraArgs));
                console.log("executed case -1");
                break;
            case 0:
                if (arg.length === 0) {
                    this.func.apply(this, [arg].concat(this.extraArgs));
                    console.log("executed case 0, empty arg");
                }
                else if (argID > -1) {
                    this.func.apply(this, [arg].concat(this.extraArgs));
                    console.log("executed case 0, with arg");
                }
                else {
                    sendOutput([new Dialog(`<span class='error'>invalid argument. argument for '${this.cmd}' is optional, but if provided, must be one of the following:\n[${this.validArgs.join(", ")}]</span>`)]);
                    console.warn("failed to execute case 0");
                }
                break;
            case 1:
                if (arg.length === 0) {
                    sendOutput([new Dialog(`<span class='error'>'${this.cmd}' requires an argument. valid options:\n[${this.validArgs.join(", ")}]</span>`, 0, 0, false)]);
                    console.warn("failed to execute case 1, missing arg");
                }
                else if (argID === -1) {
                    sendOutput([new Dialog(`<span class='error'>invalid argument. valid options:\n[${this.validArgs.join(", ")}]</span></span>`, 0, 0, false)]);
                    console.warn("failed to execute case 1, bad arg");
                }
                else  {
                    this.func.apply(this, [arg].concat(this.extraArgs));
                    console.log("executed case 1");
                }
                break;
            case 2:
                if (arg.length === 0) {
                    sendOutput([new Dialog(`<span class='error'>'${this.cmd}' requires an argument. valid options:\nany</span>`, 0, 0, false)]);
                    console.warn("failed to execute case 2, missing arg");
                }
                else {
                    this.func.apply(this, [arg].concat(this.extraArgs));
                    console.log("executed case 2");
                }
                break;
        }
    }
}

/**
 * Global commands
 */
const _globalCommands = [
     new Command("help", help),
     new Command("clear", () => {clearOutput()}),
     new Command("debug", debug, [], -1),
     new Command("list", (cmdType)=>{
        let locals = [];
        let globals  = [];
        let all = [];
        globalCommands.forEach((cmd) => {
            globals.push(cmd.cmd);
        });
        commands.forEach((cmd) => {
            locals.push(cmd.cmd);
        });
        all = globals.concat(locals);

        switch (cmdType) {
            case "":
                sendOutput([new Dialog(`all commands: ${all.join(", ")}`, 0, 0, false)]);
                break;
            case "all":
                sendOutput([new Dialog(`all commands: ${all.join(", ")}`, 0, 0, false)]);
                break;
            case "local":
                sendOutput([new Dialog(`local commands: ${locals.join(", ")}`, 0, 0, false)]);
                break;
            case "global":
                sendOutput([new Dialog(`global commands: ${globals.join(", ")}`, 0, 0, false)]);
                break;
        }

     }, ["all", "local", "global"], 0)
    //  new Command("restart", restart)
];
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

/**
 * Print line(s) of dialogue to the "terminal"
 * @param {Dialog Array} dialogArr      Array of dialog objects    
 * @param {boolean} triggerGameTimer    Whether or not the end of the queue will trigger the game timer
 * @param {number} timer                Game timer count in milliseconds
 * @param {function} timerFunc          Function to pass to the game timer when it hits 0
 */
function sendOutput(dialogArr, triggerGameTimer=false, timer=10000, timerFunc=undefined) {
    inputEnabled = false; // disable until first output run is given
    if (triggerGameTimer) {
        timerDiv.addEventListener("startTimer", handleTimerStartEvent, {once: true});
    }

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
    displayLines(dialogArr, divs, triggerGameTimer, timer, timerFunc);

    output.scrollTop = output.scrollHeight;
}

function parseInput(inputStr) {
    let inputs = inputStr.toLowerCase().trim().split(/\s+/);
    // console.log(inputs);
    let cmdID = findWithAttr(commands, "cmd", inputs[0]);
    let gCmdID = findWithAttr(globalCommands, "cmd", inputs[0]);
    // console.log(cmdID);
    // console.log(gCmdID);
    if (cmdID > -1) {
        echoInput(inputs, false);
        commands[cmdID].execute(inputs.slice(1, inputs.length).join());
        // globalCommands = _globalCommands.slice(); // reset any weird changes
    }
    else if (gCmdID > -1) {
        echoInput(inputs, false);
        globalCommands[gCmdID].execute(inputs.slice(1, inputs.length).join());
    }
    else {
        echoInput(inputs, true);
    }
}

function echoInput(inputs, err=true) {
    const inputStr = inputs.join(" ");
    // clearOutput(false);
    const echo = [
        new Dialog("<span class=\"echo\">> " + inputStr + "</span>", 0, 0, false)
    ]
    if (err) echo.push(new Dialog(`<span class='error'>command not found: '${inputs[0]}'</span>`, 0, 0, false));
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


function displayLines(diags, divs, triggerGameTimer, timer, timerFunc) {
    queueItem = new QueueItem(diags, divs, []);
    queue.push(queueItem);
    recursiveLine(diags, divs, 0, 0, queueItem, triggerGameTimer, timer, timerFunc);
}

function recursiveLine(diags, divs, row, charIndex, queueItem, triggerGameTimer, timer, timerFunc) {
    let queuePos = queue.indexOf(queueItem);
    let p = displayPromise(diags, divs, row, charIndex, queuePos, triggerGameTimer, timer, timerFunc);
    console.log(p);
    p.then((timerId)=>{
        charIndex = 0;
        ++row;
        if (row < diags.length) {
            console.log("recursive call");
            recursiveLine(diags, divs, row, charIndex, queueItem, triggerGameTimer, timer, timerFunc);
        }
        else {
            console.log("finished item");
            queuePos = queue.indexOf(queueItem); // Update in case indices changed from prior removal
            queue.splice(queuePos, 1);
            if (triggerGameTimer) {
                // TODO: trigger game timer here
                // startGameTimer(timer, timerFunc);
                const e = new CustomEvent("startTimer", {
                    detail: {
                        time: timer,
                        func: timerFunc,
                        id: timerId
                    }
                });
                timerDiv.dispatchEvent(e);
            }
        }
        console.log("after recursive call");
    }).catch((timerId)=>{
        console.log("forcing output");
    });
}

const displayPromise = (diags, divs, row, charIndex, queuePos, triggerGameTimer, timerTime, timerFunc) => {
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
                        gameTimerID = timeout;
                        resolve(timeout);
                        console.log("timerID: " + timeout);
                    }
                }, diags[row].delay);
                queue[queuePos]["timerArr"].push(timer);
                output.addEventListener("forceOutput", function cancel(e) {
                    console.log("force event consumed");
                    clearInterval(timer);
                    gameTimerID = timeout;
                    reject(timeout); // ! sometimes this doesn't get received
                    console.log("timerID: " + timeout);
                    if (triggerGameTimer) {
                        // TODO: trigger game timer here
                        const ev = new CustomEvent("startTimer", {
                            detail: {
                                time: timerTime,
                                func: timerFunc,
                                id: timeout
                            }
                        });
                        timerDiv.dispatchEvent(ev);
                    }
                }, {once: true});
            }
            else {
                divs[row].innerHTML = str;
                resolve(timeout);
            }
            inputEnabled = true; // reenable input - safe to accept input
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

function findHasAttr(array, attr, value) {
    if (array.length < 1) return -1;
    for (let i = 0; i < array.length; i++) {
        try {
            if (array[i][attr].indexOf(value) > -1) {
                return i;
            }
        }
        catch { // if doesn't exist
            return -1;
        }
    }
}


document.addEventListener("keypress", ()=>{
    input.focus();
    output.scrollTop = output.scrollHeight;
});





/**
 * Story and commands
 */

function debug(...args) {
    stopGameTimer();
    clearOutput(true);
    try {
        const index = findWithAttr(gameScenes, "name", args[0]);
        if (index > -1) {
            gameScenes[index].apply(null);    
        }
        else {
            gameScenes[parseInt(args[0])].apply(null);
        }
    }
    catch {
        let sceneList = [];
        for (let i = 0; i < gameScenes.length; i++) {
            sceneList.push(`${i} : ${gameScenes[i].name}`);
        }
        const debugDiag = [
            new Dialog("To jump to a scene, type 'debug' followed by the ID or name from this list:", 0, 0, true),
            new Dialog(sceneList.join("\n"), 0, 0, true)
        ];
        sendOutput(debugDiag);
    }    
}



function help(loop=false) {
    // persistOutput();
    const dialog_help = [
        new Dialog("look out for <span class='cmd'>hints</span>", 100, 0, false)
    ]
    sendOutput(dialog_help);
    // persistOutput();
    globalCommands = _globalCommands.slice();
    globalCommands.push(new Command("hints", hints));
}

function hints() {
    // persistOutput();
    const dialog_help = [
        new Dialog("they may be of <span class='cmd'>help</span>", 100, 0, false)
    ]
    sendOutput(dialog_help);
    // persistOutput();
    globalCommands = _globalCommands.slice();
}

// todo: make it so that choosing "no" will restore the scene you were just on
// ! will bug you out if you try to restart during a countdown sequence
function restart(last_scene) {
    const dia = [
        new Dialog("are you sure you want to restart? (Y/N)", 50, 0, false),
    ];
    globalCommands = _globalCommands.splice();
    const prompt = [
        new Command("Y", ()=>{start()}),
        new Command("N", ()=>{
            clearOutput(false);
            globalCommands = _globalCommands;
        })
    ];
    globalCommands.push(...prompt)
    sendOutput(dia);
}

function start() {
    stopGameTimer();
    clearOutput(true);
    const dialog_start = [
        new Dialog("ultimo", 100, 1000, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("<span class='cmd'>start</span> day", 100, 1000, true),
        new Dialog("", 0, 0, true),
        new Dialog("", 0, 0, true),
        new Dialog("<span class='hint'>hint: try typing <span class='cmd'>help</span> and hitting enter</span>", 50, 3000, true),
    ];
    
    sendOutput(dialog_start);
    commands = [
        new Command("start", story_day1, ["day", "game"], 0),
        new Command("version", ()=>{
            sendOutput([new Dialog(version, 100, 0, true)]);
        })
    ];
}

function story_day1() {
    stopGameTimer();
    clearOutput(true);
    inputEnabled = false; // duct tape bugfix to stop access to debug screen while countdown is going
    commands = [];
    let clock = ["t-72:00:00", "t-71:00:59", "t-71:00:58", "t-71:00:57", ""]
    let i = 0;
    const inter = setInterval(()=>{
        startGameTimer(4000, ()=>{inputEnabled = true});
        clearOutput(true);
        sendOutput([new Dialog(clock[i], 0, 0, true)]);
        ++i;
        if (i >= clock.length) {
            clearOutput(true);
            clearInterval(inter);
            inputEnabled = true;
            setTimeout(story_day1_a, 1000);
        }
    }, 1000);
}

function story_day1_a() {
    stopGameTimer();
    clearOutput(true);
    const dia = [
        new Dialog("you've got a busy day today", 15, 500, true),
        new Dialog("you arrived early at the office", 15, 1000, true),
        new Dialog("you've been hearing <span class='cmd'>murmurs</span>", 15, 1500, true),
        new Dialog("you're not sure what they're saying", 15, 1500, true),
        new Dialog("", 100, 1000, true),
        new Dialog("you've got <span class='cmd'>work</span> to do before going home tonight", 15, 1000, true)
    ];
    commands = [
        new Command("murmurs", story_day1_murmurs),
        new Command("work", story_day1_work),
    ];
    sendOutput(dia, true, 20000, story_day1_work); // 20 seconds to choose your path
}

function story_day1_murmurs() {
    stopGameTimer();
    clearOutput(true);
    const dia = [
        new Dialog("you overhear them saying <span class='cmd'>something</span> about the moon", 15, 500, true),
        new Dialog("you saw on the weather yesterday that it was going to be a full moon", 15, 1000, true),
        new Dialog(" ", 10, 1500, true),
        new Dialog("it doesn't really matter", 10, 0, true),
        new Dialog("", 100, 1000, true),
        new Dialog("you've got some <span class='cmd'>work</span> to finish", 15, 0, true)
    ];
    commands = [
        new Command("something", story_day1_something),
        new Command("work", story_day1_work),
    ];
    sendOutput(dia, true, 15000, story_day1_work); // 15 seconds to choose your path
}

function story_day1_something() {
    stopGameTimer();
    clearOutput(true);
    const dia = [
        new Dialog("\"I'm sure NASA and SpaceX and all them will figure somethin' out.\"", 15, 500, true),
        new Dialog("\"Hail Mary, full of grace...\"", 30, 1000, true),
        new Dialog(" ", 10, 2000, true),
        new Dialog("you look at the time and see it's 6pm", 15, 0, true),
        new Dialog("you'll have to finish your work tomorrow.", 15, 1000, true)
    ];
    commands = [];
    sendOutput(dia, true, 5000, story_day1_somethingb); // 5 seconds before next day
}

function story_day1_somethingb() {
    stopGameTimer();
    clearOutput(true);
    const dia = [
        new Dialog("", 10, 500, true),
        new Dialog("you clock out and headed home", 10, 1000, true),
        new Dialog(" ", 10, 2000, true),
        new Dialog("the streets are eerily quiet", 10, 0, true),
        new Dialog("", 100, 2000, true),
        new Dialog("the moon looks big tonight", 10, 0, true)
    ];
    commands = [];
    sendOutput(dia, true, 5000, () => {
        story_day2("b");
    }); // 5 seconds before next day
}

function story_day1_work() {
    stopGameTimer();
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
    sendOutput(dia, true, 15000, () => {
        story_day2("a");
    }); // 5 seconds before next day
}

function story_day2(path) {
    stopGameTimer();
    clearOutput(true);
    inputEnabled = false; // duct tape fix to prevent access to debug screen mid-countdown
    commands = [];
    let clock = ["t-48:00:00", "t-47:00:59", "t-47:00:58", "t-47:00:57", ""]
    let i = 0;
    const inter = setInterval(()=>{
        clearOutput(true);
        startGameTimer(4000, () => {inputEnabled = true;});
        sendOutput([new Dialog(clock[i], 0, 0, true)]);
        ++i;
        if (i >= clock.length) {
            clearOutput(true);
            clearInterval(inter);
            inputEnabled = true;
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
    stopGameTimer();
    clearOutput(true);
    const dia = [
        new Dialog("you wake up a little late this morning.", 15, 500, true),
        new Dialog("it seems a bit overcast today.", 30, 1000, true),
        new Dialog("you don't hear any birds.", 10, 1000, true),
        new Dialog("", 15, 0, true),
        new Dialog("you think about putting in some <span class='cmd'>extra hours</span> today.", 15, 2000, true),
        new Dialog("you might give your parents a surprise <span class='cmd'>visit</span>", 15, 1000, true)
    ];
    commands = [
        new Command("extra hours", story_day2a_work),
        new Command("visit", story_day2a_visit)
    ];
    sendOutput(dia, true, 15000, story_day2a_work); // 15 seconds to choose path
}

function story_day2a_work() {
    stopGameTimer();
    clearOutput(true);
    commands = []
    let dia = [
        new Dialog("you drive to work.", 15, 500, true),
        new Dialog("the streets are strangely empty.", 30, 2000, true),
    ];
    sendOutput(dia, true, 10000, ()=>{
        clearOutput(true);
        commands = [
            new Command("Mr. Brevi", story_day2a_brevi1)
        ];
        dia = [
            new Dialog("you arrive at the office.", 15, 500, true),
            new Dialog("there's only one car.", 30, 1000, true),
            new Dialog("", 30, 0, true),
            new Dialog("you recognize it belonging to your kind elderly supervisor, <span class='cmd'>Mr. Brevi</span>", 30, 1000, true)
        ];
        sendOutput(dia, true, 5000, story_day2a_brevi1); // 5 seconds before defaulting
    });
}

function story_day2a_brevi1() {
    stopGameTimer();
    clearOutput(true);
    commands = [
        new Command("Mr. Brevi", story_day2a_brevi2),
        new Command("walk", story_day2a_brevi1_walk),
    ];
    let dia = [
        new Dialog("you enter the office.", 15, 500, true),
        new Dialog("all the lights are off except for <span class='cmd'>Mr. Brevi</span>'s.", 30, 2000, true),
        new Dialog("", 0, 1000, true),
        new Dialog("you <span class='cmd'>walk</span> toward your cubicle", 15, 1000, true)
    ];
    sendOutput(dia, true, 10000, story_day2a_brevi1_walk); // 10 seconds until defaulting
}

function story_day2a_brevi1_walk() {
    stopGameTimer();
    clearOutput(true);
    commands = [
        
    ];
    let dia = [
        new Dialog("work in progress", 15, 500, true)
    ];
    sendOutput(dia, true, 10000, ()=>{}); // 10 seconds until defaulting
}

function story_day2a_brevi2() {
    stopGameTimer();
    clearOutput(true);
    commands = [
        
    ];
    let dia = [
        new Dialog("work in progress", 15, 500, true)
    ];
    sendOutput(dia, true, 10000, ()=>{}); // 10 seconds until defaulting
}

function story_day2a_visit() {
    stopGameTimer();
    clearOutput(true);
    commands = []
    let dia = [
        new Dialog("work in progress", 15, 500, true)
    ];
    sendOutput(dia, true, 10000, ()=>{}); // 10 seconds until defaulting
}

function story_day2b() {
    stopGameTimer();
    clearOutput(true);
    commands = [];
    let dia = [
        new Dialog("work in progress", 15, 500, true)
    ];
    sendOutput(dia, true, 10000, ()=>{}); // 10 seconds until defaulting
}


const gameScenes = [
    start, 
    story_day1, 
    story_day1_a, story_day1_murmurs, story_day1_something, story_day1_somethingb, story_day1_work, 
    story_day2, 
    story_day2a, story_day2a_brevi1, story_day2a_brevi1_walk, story_day2a_brevi2, story_day2a_visit, 
    story_day2b
];

start();
