import React, {useEffect, useState} from 'react'
import {
    Button,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    FormControl, FormControlLabel, FormGroup,
    Grid, IconButton,
    InputLabel,
    MenuItem,
    Select, Switch,
    ToggleButton,
    ToggleButtonGroup
} from "@mui/material";
import {Piano} from "react-piano";
import 'react-piano/dist/styles.css';
import classNames from 'classnames';
import {
    addMeasure, removeMeasure,
    deepClone,
    getLyNoteByMidiNoteInKey, getVfNoteByMidiNoteInKey,
    notationInfoToLyString,
    noteNames,
    parseLilypondDictation
} from "./notationUtils";
import {NotationView} from "./NotationView";

import Tie from './images/tie.png';
import WholeNote from "./images/whole.png" ; // require() does not work with Preview, do separate imports
import HalfNote from "./images/half.png"
import QuarterNote from "./images/quarter.png"
import EightNote from "./images/eighth.png"
import SixteenthNote from "./images/sixteenth.png"
import Dot from "./images/dot.png"
import Rest from "./images/rest.png"
import AddBar from "./images/add-bar.png"
import NoteUp from "./images/note-up.png"
import NoteDown from "./images/note-down.png"
import DeleteBar from "./images/delete-bar.png"

import BackspaceIcon from '@mui/icons-material/Backspace';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';



export function NotationInput({lyStart, setNotationInfo, notationInfo, selectedNote,
                                setSelectedNote, t, resizeFunction, showTimeAndClefInput=false }) {

    const [keyboardStartingOctave, setKeyboardStartingOctave ] = useState(3);
    const [lyInput, setLyInput] = useState(lyStart);
    const [currentKey, setCurrentKey] = useState("C");
    const [currentClef, setCurrentClef] = useState("treble");
    const [currentDuration, setCurrentDuration] = useState("4");
    const [dotted, setDotted] = useState(false); // empty string or "d" ; in future could be also "dd"
    const [lyFocus, setLyFocus] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [showLilypond, setShowLilypond] = useState(showTimeAndClefInput); // init with true, if header row is shown -  that means it is in editor mode

    // notation functions (add, insert, delete

    useEffect( () => {
        setLyInput(notationInfoToLyString(notationInfo));
    } , [notationInfo]);

    // useEffect(() => {
    //     document.addEventListener("keydown", onKeyDown);
    //     return () => {
    //         document.removeEventListener("keydown", onKeyDown);
    //     };
    // });

    const onKeyDown = (e) => {
        const noteNameKeys = ["c", "d", "e", "f", "g", "a", "b", "h"];
        //console.log("key pressed: ", e.key, e.ctrlKey, e.ctrl);
        if (lyFocus) {
            if (e.key==="Enter" && e.ctrlKey) {
                //console.log("Ctrl + return pressed in lyinput");
                handleLyNotation();
                e.preventDefault(); // cancel default
                e.stopPropagation();
            }

        } else  { // ignore keys when focus in lilypond input
            e.preventDefault(); // cancel default. Not sure if it good though
            e.stopPropagation();
            if (noteNameKeys.includes(e.key.toLowerCase())) {

                const noteName = (e.key.toLowerCase()==="h") ? "B": (e.key.toLowerCase()==="b" ) ? "Bb" : e.key.toUpperCase() ;
                console.log("Note from key", noteName);
                let octave = (e.key.toLowerCase() === e.key ) ? "4" : "5"; // uppercase letters give 2nd octave; what about small?
                if (e.ctrlKey) { // Ctrl + noteName -  small octava
                    octave = "3";
                }
                inputHandler(noteName+"/" + octave, currentDuration);
            } else if (e.key === "ArrowLeft") {
                if (e.ctrlKey) {
                    console.log("Control left");
                    nextMeasure(-1);
                } else {
                    //console.log("Just arrow left")
                    nextNote(-1);
                }
            } else if (e.key === "ArrowRight") {
                if (e.ctrlKey) {
                    nextMeasure(1);
                } else {
                    //console.log("Just arrow right")
                    nextNote(1);
                }
            } else if (e.key === "ArrowUp") {
                noteStep(1);
                // perhaps ctrl + up/down -  change octava?
                e.preventDefault();
                e.stopPropagation();
            } else if (e.key === "ArrowDown") {
                noteStep(-1);
                e.preventDefault();
                e.stopPropagation();
            }  else if (e.key === "+") {
                addBar();
            }
            else if (e.key === "1") {
                durationChange("1" +  (dotted ? "d" : "" ));
            } else if (e.key === "2") {
                durationChange("2" +  (dotted ? "d" : "" ));
            } else if (e.key === "4") {
                durationChange("4" +  (dotted ? "d" : "" ));
            } else if (e.key === "8") {
                durationChange("8" +  (dotted ? "d" : "" ));
            } else if (e.key === "6") {
                durationChange("16" +  (dotted ? "d" : "" ));
            } else if (e.key === ".") {
                dotChange();
            } else if (e.key === "r") {
                restHandler();
            } else if (e.key === "t") { // tie
                tieChange();
            } else if (e.key === "Backspace" || e.key === "Delete") {
                deleteHandler();
            }
        }
    }

    //useEffect( () => console.log("selectedNote: ", selectedNote), [selectedNote] );

    const nextMeasure = (advance=1) => { // moves to next or previous measure
        let newPosition = deepClone(selectedNote);
        if (advance>0) {
            if (selectedNote.measure < notationInfo.staves[0].measures.length-1 ) {
                newPosition.measure++;
                if (notationInfo.staves[0].measures[newPosition.measure].notes.length>0) {
                    newPosition.note=0;
                } else {
                    newPosition.note = -1;
                }
            } else {
                console.log("Last bar");
            }
        } else {
            if (selectedNote.measure > 0 ) {
                newPosition.measure--;
                newPosition.note = -1;
            }
        }
        setSelectedNote(newPosition);
    }

    const nextNote = (advance=1) => { // moves to next or previous measure
        let newPosition = deepClone(selectedNote);
        if (advance>0) {
            if (selectedNote.note < notationInfo.staves[0].measures[selectedNote.measure].notes.length-1 ) {
                newPosition.note++;
            } else {
                newPosition.note = -1;
            }
        } else {
            if (selectedNote.note > 0 ) {
                    newPosition.note--;
            } else if (selectedNote.note<0 && notationInfo.staves[0].measures[selectedNote.measure].notes.length>0) { // at the end of the bar
                newPosition.note=notationInfo.staves[0].measures[selectedNote.measure].notes.length-1;
            }
        }
        setSelectedNote(newPosition);
    }

    const replaceNote =  (position, keys, duration) =>  { // position { measure: , note: staff: }

        const notation = deepClone(notationInfo);

        const measureIndex = position.measure || 0;
        const noteIndex =  position.note || 0;
        const staff = position.staff || 0;

        console.log("Add note to position ", measureIndex, noteIndex);
        notation.staves[staff].measures[measureIndex].notes[noteIndex] = {
            clef: currentClef, keys: keys, duration: duration, auto_stem: "true"
        }; // + other fields later

        //console.log("Notes: ", notation.staves[staff].measures[measureIndex].notes)
        // does this trigger re-render for react component?
        setNotationInfo(notation);
    }

    const insertNote =  (position, keys, duration) =>  { // position { measure: , note: staff: }

        const notation = deepClone(notationInfo);

        const measureIndex = position.measure || 0; // do we need those? for any case...
        const noteIndex =  position.note || 0;
        const staff = position.staff || 0;

        console.log("Insert note to position ", measureIndex, noteIndex);
        notation.staves[staff].measures[measureIndex].notes.splice(noteIndex, 0,  {
            clef: currentClef, keys: keys, duration: duration, auto_stem: "true"
        } );
        console.log("Notes after insert: ", notation.staves[staff].measures[measureIndex].notes)


        // does this trigger re-render for react component?
        setNotationInfo(notation);
        // if (setSelectedNote) {
        //     setSelectedNote(position);
        // }

    }

    const addNote = (keys, duration) => { // add note to the end of the bar
        const staff = selectedNote.staff ;
        const measureIndex = selectedNote.measure >= 0 ? selectedNote.measure : 0; //notationInfo.staves[staff].measures.length>0 ? notationInfo.staves[staff].measures.length - 1 :0 ;

        const noteIndex = notationInfo.staves[staff].measures[measureIndex].notes.length; // index to the note after last one
        console.log("indexes: ", measureIndex, noteIndex, staff);
        replaceNote({note:noteIndex, measure: measureIndex, staff:staff}, keys, duration);
    }

    const deleteHandler  = () => {
        if (selectedNote.note>=0 && selectedNote.note-parseInt(selectedNote.note)===0 ) {
            deleteNote(selectedNote)
        } else {
            deleteLastNote();
        }
    }

    const deleteNote =  (position) =>  { // position { measure: , note: staff: }

        const notation = deepClone(notationInfo);

        const measureIndex = position.measure || 0;
        const noteIndex = position.note || 0;
        const staff = position.staff || 0;

        console.log("Delete note from position ", measureIndex, noteIndex);

        notation.staves[staff].measures[measureIndex].notes.splice(noteIndex, 1);

        console.log("Notes: ", notation.staves[staff].measures[measureIndex].notes)
        // does this trigger re-render for react component?
        setNotationInfo(notation);
    }

    const deleteLastNote = () => { // removes last note in selected measurein measure

        const notation = deepClone(notationInfo);
        const measureIndex = selectedNote.measure || 0;
        const staff = selectedNote.staff || 0;

        notation.staves[staff].measures[measureIndex].notes.pop();
        setNotationInfo(notation);

    }

    const addBar = () => {
        const newNotationInfo = deepClone(notationInfo);
        addMeasure(newNotationInfo, 1);
        setNotationInfo(newNotationInfo);
    }

    const deleteBar = () => {
        const newNotationInfo = deepClone(notationInfo);
        removeMeasure(newNotationInfo, selectedNote.measure);
        setNotationInfo(newNotationInfo);
    }

    // TODO - mõtle siin ,kuidas asendada viimane noot, kui selle mingi operatsioon. Viimase noodi valimine tehtud, aga vaja anda ka positsioon
    const getCurrentNote = () => { // returns the selected note or one before if at the end of the bar
        let note = null;
        if (selectedNote.note>=0 ) {
            note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes[selectedNote.note];
        } else {
          if (notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.length>0) {
              console.log("getCurrentNote: at end, return the previous one")
              note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.at(-1); // retrun the last note
          }
        }
        return note;
    }


    const noteChange = (vfNote) => {
        inputHandler(vfNote, currentDuration );
    }

    const noteStep = (step) => { // step>=0 for up in noteNames, <0 -  down
        const note = getCurrentNote();
        if (!note) {
            console.log("No note to change");
            return;
        }
        let position = deepClone(selectedNote); //necessary for being able to  change the last note
        if (position.note<0) {
            position.note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.length -1 ;
        }
        let [noteName, octave] = note.keys[0].split("/")
        const vfNoteNames = Array.from(noteNames.values());
        let index = vfNoteNames.indexOf(noteName);

        if (index<0) {
            console.log("note not found in noteStep: ", noteName);
            return;
        }

        index += step;

        if (index >= vfNoteNames.length ) {
            index = 0;
            octave = (parseInt(octave)+1).toString();
        }

        if (index <0 ) {
            index = vfNoteNames.length-1;
            octave = (parseInt(octave)-1).toString();
        }

        replaceNote(position, [ vfNoteNames[index]+ "/"+octave ], note.duration);

    }

    const restHandler = () => {
        const restNote =  currentClef==="bass" ? "d/3" : "b/4";
        inputHandler(restNote, currentDuration +  "r");
    }

    const invertDot = (duration) => {
        let newDuration = "";

        if (duration.includes("d")) {
            newDuration = duration.replace("d",""); // for several dots need reg.exp
        } else { // add dot
            if (duration.endsWith("r")) {
                newDuration = duration.slice(0, -1) + "dr";
            } else {
                newDuration = duration + "d";
            }
        }
        return newDuration;
    }

    const dotChange = () => {

        //let note = null;
        if (selectedNote.note>=0) {
            if (selectedNote.note - parseInt(selectedNote.note)===0.5) {
                console.log("Selection between notes, no dot");
                return;
            }
            const note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes[selectedNote.note];
            const duration = invertDot(note.duration);
            //console.log("Change dot: ", duration);
            replaceNote(selectedNote, note.keys, duration);
        } else if (notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.length>0) {
            const note =   notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.at(-1);
            const duration = invertDot(note.duration);
            const position = deepClone(selectedNote);
            position.note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes.length-1;
            //console.log("Dealing with  last note dot ", selectedNote.note, duration, note,position);
            replaceNote(position, note.keys, duration);
        } else {
            console.log("No note to add dot to");
        }
    }

    const tieChange = () => { // adds or removes tie to the note



        const notation = deepClone(notationInfo);
        console.log("Set/unset tie");
        // TODO: position:

        const note = selectedNote.note>=0 ? notation.staves[selectedNote.staff].measures[selectedNote.measure].notes[selectedNote.note] :
            notation.staves[selectedNote.staff].measures[selectedNote.measure].notes.at(-1);

        // what if the note is the last one in th bar?


        if (!note) {
            console.log("No note");
            return;
        }

        if ( !note.hasOwnProperty("tied") ) {
            note.tied = true; // set
        } else {
            note.tied = !note.tied; // or flip
        }
        //console.log("Tie situation for note: ", note);

        setNotationInfo(notation);
    }

    const durationChange = (newDuration) => {
        console.log("setting new duration to: ", newDuration);
        if (selectedNote.note>=0) { // Need to update notation
            const note = notationInfo.staves[selectedNote.staff].measures[selectedNote.measure].notes[selectedNote.note]
            const vfNote = note.keys[0]; // NB! chords not supported!
            const duration = note.duration.endsWith("r") ? newDuration + "r" : newDuration ; // keep it rest if it was before so

            console.log("Change duration of note: ", vfNote);
            inputHandler(vfNote, duration);
        }
        setCurrentDuration(newDuration)
    }

    const inputHandler = ( vfNote, duration="") => {
        const keys = [vfNote]; // maybe send keys as array immediately -  more easy for durationChange
        if (selectedNote.note-parseInt(selectedNote.note) === 0.5) {
            const newPosition = deepClone(selectedNote);
            newPosition.note = selectedNote.note + 0.5; // to insert it into right place
            insertNote(newPosition, keys, duration);
            //console.log("Set selectedNote to: ", newPosition);
            setSelectedNote(newPosition);
        } else if (selectedNote.note<0) { // signals that none selected, insert in the end
            addNote(keys, duration );
        } else {
            replaceNote(selectedNote, keys, duration );
        }
    }



    // piano keyboard - perhaps make later a separate component ?  --------------------
    // for piano keyboard
    const firstNote = (keyboardStartingOctave+1)*12+5; // default - f3
    const lastNote = (keyboardStartingOctave+3)*12 + 4; // for now range is fixed to 2 octaves + maj. third
    // see https://github.com/kevinsqi/react-piano/blob/master/src/KeyboardShortcuts.js for redfining
    const octaveData = {
        maxOctave: 6,
        minOctave: 2
    }

    const handlePlayNote = midiNote => { // called when a MIDI keyboard key is pressed
        const key = notationInfo.staves[0].key; //currentKey ? currentKey : "C";
        console.log ("We are in key: ",  key);


        const vfNote = getVfNoteByMidiNoteInKey(midiNote, key);
        //console.log("vfnote: ", vfNote);
        //console.log("Notation at this point: ", notationInfo);
        if (vfNote) {
            noteChange(vfNote);
        }

    }


    const handleLyNotation = () => {
        //console.log("commented out...");
        const notation = parseLilypondDictation(lyInput);
        if (notation && setNotationInfo) {
            setNotationInfo(notation);
        } else {
            console.log("Notation error or setter not set");
        }

    }

    // extended from: https://github.com/kevinsqi/react-piano/blob/a8fac9f1ab0aab8fd21658714f1ad9f14568feee/src/ControlledPiano.js#L29
    const renderNoteLabel =  ({ keyboardShortcut, midiNumber, isActive, isAccidental }) => {
        const isC = midiNumber%12===0

        return keyboardShortcut || isC ? (
            <div
                className={classNames('ReactPiano__NoteLabel', {
                    'ReactPiano__NoteLabel--active': isActive,
                    'ReactPiano__NoteLabel--accidental': isAccidental,
                    'ReactPiano__NoteLabel--natural': !isAccidental,
                })}
            >
                {keyboardShortcut}
                { midiNumber%12===0 &&
                    <p style={{color:"black", fontSize:"0.6em", textAlign:"left", marginLeft:"3px" }}>C{(midiNumber/12-1)}</p>
                } {/*C3, C4 etc on C keys*/}
            </div>
        ) : null;
    }

    // UI ---------------------------------------------------------

    const handleKeySelect = (event) => {
        const key = event.target.value;
        console.log("selected key: ", key);
        setCurrentKey(key); // inf form C, Cm, C# etc
        const notation = deepClone(notationInfo);
        // set it to all staves
        for (let stave of notation.staves) {
            stave.key = key;
        }
        setNotationInfo(notation);
    }

    const handleClefSelect = (event) => {
        const clef = event.target.value;
        setCurrentClef(clef); // NB! this does not update already existing VF stavenotes' clef value!
        const notation = deepClone(notationInfo);
        // TODO: time and key should be the same for all staves in notationInfo
        // temporary- set only for the first stave -  two voiced dictations not supported
        if (clef==="bass") {
            setKeyboardStartingOctave(2);
        } else {
            setKeyboardStartingOctave(3);
        }
        notation.staves[0].clef = clef;
        setNotationInfo(notation);

    }

    const handleTimeSelect = (event) => {
        const time = event.target.value;
        const notation = deepClone(notationInfo);
        // TODO: time and key should be the same for all staves in notationInfo
        // temporary- set for all staves
        for (let stave of notation.staves) {
            stave.time = time;
        }
        setNotationInfo(notation);
    }

    const createHeaderRow = () => { // time tempo etc
        return (
            <Grid item container spacing={1}>

                <Grid item>
                    <FormControl variant="standard">
                        <InputLabel id="keyLabel">{t.key || "Key"}</InputLabel>
                        <Select
                            labelId="keyLabel"
                            // value={selectedKey}
                            defaultValue={"C"}
                            onChange={handleKeySelect}
                        >
                            <MenuItem value={"C"}>C</MenuItem>
                            <MenuItem value={"Cm"}>c</MenuItem>
                            <MenuItem value={"C#"}>Cis</MenuItem>
                            <MenuItem value={"C#m"}>cis</MenuItem>
                            <MenuItem value={"Db"}>Des</MenuItem>
                            <MenuItem value={"D"}>D</MenuItem>
                            <MenuItem value={"Dm"}>d</MenuItem>
                            <MenuItem value={"Eb"}>Es</MenuItem>
                            <MenuItem value={"Ebm"}>es</MenuItem>
                            <MenuItem value={"E"}>E</MenuItem>
                            <MenuItem value={"Em"}>e</MenuItem>
                            <MenuItem value={"F"}>F</MenuItem>
                            <MenuItem value={"Fm"}>f</MenuItem>
                            <MenuItem value={"F#"}>Fis</MenuItem>
                            <MenuItem value={"F#m"}>fis</MenuItem>
                            <MenuItem value={"G"}>G</MenuItem>
                            <MenuItem value={"Gm"}>g</MenuItem>
                            <MenuItem value={"Ab"}>As</MenuItem>
                            <MenuItem value={"Abm"}>as</MenuItem>
                            <MenuItem value={"A"}>A</MenuItem>
                            <MenuItem value={"Am"}>a</MenuItem>
                            <MenuItem value={"Bb"}>B</MenuItem>
                            <MenuItem value={"Bbm"}>b</MenuItem>
                            <MenuItem value={"B"}>H</MenuItem>
                            <MenuItem value={"Bm"}>h</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item>
                    <FormControl variant="standard">
                        <InputLabel id="clefLabel">{t.clef || "Clef"}</InputLabel>
                        <Select
                            id="clefSelect"
                            defaultValue={"treble"}
                            label={t.clef || "Clef"}
                            onChange={ handleClefSelect }
                        >
                            <MenuItem value={"treble"}>{t.treble || "treble"}</MenuItem>
                            <MenuItem value={"bass"}>{t.bass || "bass"}</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item>
                    <FormControl variant="standard">
                        <InputLabel id="timeLabel">{t.time || "Time"}</InputLabel>
                        <Select
                            defaultValue={"4/4"}
                            onChange={ handleTimeSelect }
                        >
                            <MenuItem value={"2/4"}>2/4</MenuItem>
                            <MenuItem value={"3/4"}>3/4</MenuItem>
                            <MenuItem value={"4/4"}>4/4</MenuItem>
                            <MenuItem value={"5/4"}>5/4</MenuItem>
                            <MenuItem value={"6/4"}>6/4</MenuItem>
                            <MenuItem value={"3/8"}>3/8</MenuItem>
                            <MenuItem value={"5/8"}>5/8</MenuItem>
                            <MenuItem value={"6/8"}>6/8</MenuItem>
                            <MenuItem value={"7/8"}>7/8</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>

            </Grid>
        )
    }

    const changeStartingOctave = (change=0) => {
        const startingOctave = keyboardStartingOctave;
        if (change>0 && keyboardStartingOctave < octaveData.maxOctave-2 ) {
            setKeyboardStartingOctave(startingOctave+1);
        } else if (change<0 && keyboardStartingOctave > octaveData.minOctave) {
            setKeyboardStartingOctave(startingOctave-1);
        }
    }

    const createPianoRow = () => {
        return (
            <Grid item container direction={"row"} alignItems={"center"}>
                <Grid item><IconButton aria-label={"octava lower"} onClick={()=>changeStartingOctave(-1)}> <NavigateBeforeIcon /> </IconButton></Grid>
                <Grid item>
                    <div >  {/*make it scrollable like notation, if does not fit  oli: className={"vtDiv center"} */}
                        <Piano
                            /*className = {"center"}*/
                            noteRange={{ first: firstNote, last: lastNote }}
                            playNote={handlePlayNote}
                            stopNote={(midiNumber) => {}}
                            width={420}  // how is it on mobile screen
                            keyboardShortcuts={[]/*keyboardShortcuts*/}
                            renderNoteLabel={renderNoteLabel}
                        />
                    </div>
                </Grid>
                <Grid item><IconButton aria-label={"octava higher"} onClick={()=>changeStartingOctave(1)}><NavigateNextIcon /></IconButton></Grid>
            </Grid>
        )
    }

    const createButtonsRow = () => {

        return (
            <>
            <Grid container item direction={"row"} spacing={1} alignItems={"center"}>
                <Grid item>
                    <ToggleButtonGroup
                        value={currentDuration}
                        exclusive
                        onChange={ event => durationChange(event.currentTarget.value +  (dotted ? "d" : "" ) ) }
                        aria-label="duration selection"
                    >
                        <ToggleButton value="1" aria-label="whole note" >
                            <img src={WholeNote} />
                            {/*<label style={{color:"red", fontSize:"0.5em", textAlign:"left",  left:"3", top:"-20" }} >1</label>*/}
                        </ToggleButton>
                        <ToggleButton value="2" aria-label="half note">
                            <img src={HalfNote} />
                        </ToggleButton>
                        <ToggleButton value="4" aria-label="quarter note">
                            <img src={QuarterNote} />
                        </ToggleButton>
                        <ToggleButton value="8" aria-label="eighth note">
                            <img src={EightNote} />
                        </ToggleButton>
                        <ToggleButton value="16" aria-label="sixteenth note">
                            <img src={SixteenthNote} />
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Grid>
                {/*ToggleButtons is used down here to give similar look, they are simple buttons by function*/}
                <Grid item>
                    <ToggleButton sx={{height:51}} value={"."} aria-label={"add or remove dot"}  onClick={() => dotChange()}>
                       <img src={Dot} />
                    </ToggleButton>
                </Grid>
                <Grid item>
                    <ToggleButton  value={"rest"} aria-label={"rest"}  onClick={() => restHandler()}><img src={Rest} /></ToggleButton>
                </Grid>
                <Grid item>
                    <ToggleButton sx={{height:51}} value={"tie"} aria-label={"add or remove tie"}  onClick={()=>tieChange()}>
                        <img src={Tie}/>
                    </ToggleButton>
                </Grid>
                <Grid item>
                    <ToggleButton sx={{height:51}} value={"delete"} aria-label={"delete"} onClick={()=>deleteHandler()}> <BackspaceIcon /> </ToggleButton>
                </Grid>


            </Grid>
                <Grid container item direction={"row"} spacing={1} alignItems={"center"}>
                    <Grid item>
                        <ToggleButton sx={{height:51}} value={"noteUp"} aria-label={"note up"} onClick={()=>noteStep(1)}><img src={NoteUp} /></ToggleButton>
                    </Grid>
                    <Grid item>
                        <ToggleButton sx={{height:51}} value={"noteDown"} aria-label={"note down"} onClick={()=>noteStep(-1)}><img src={NoteDown} /></ToggleButton>
                    </Grid>
                    <Grid item>
                        <ToggleButton sx={{height:51}} value={"addBar"} aria-label={"add bar"} onClick={()=>addBar()}><img src={AddBar} /></ToggleButton>
                    </Grid>
                    <Grid item>
                        <ToggleButton sx={{height:51}} value={"deleteBar"} aria-label={"delete bar"} onClick={()=>deleteBar()}><img src={DeleteBar} /></ToggleButton>
                    </Grid>
                    <Grid item>
                        {createShortcutsDialog()}
                    </Grid>
                </Grid>
            </>
        );

    }



    const createShortcutsDialog = () => {
        return  (
            <Grid item container alignItems={"flex-start"}>
                <IconButton aria-label={"Show shortcuts dialog"} onClick={() => setDialogOpen(true)} >
                    <HelpOutlineIcon />
                </IconButton>
                <Dialog onClose={()=>setDialogOpen(false)} open={dialogOpen}>
                    <DialogTitle>{t.keyboardShortcuts}</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {t.youCanUseFollowingShortcuts} <br />
                            <i>NB! {t.clickSomewhereOnTheScreen}</i><br />
                            <br />
                            {t.noteNameInfo}<br />
                            {t.durationInfo} <br />
                            {t.rest}: r<br />
                            {t.dotInfo}: .<br />
                            {t.tieInfo}: t<br />
                            {t.raiseLowerInfo} <br />
                            {t.navigationInfo}<br />
                                <br />
                            {t.clickBetweenNotes}<br />
                            <br />
                            <i>{t.textInput}</i> - {t.engraveInfo} <br />
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={()=>setDialogOpen(false)}>Close</Button>
                    </DialogActions>
                </Dialog>
            </Grid>
        );
    }

    return <div className={"h5p-musical-dictations-uiDiv h5peditor-notationInput-margin-top"} >
        <Grid container direction={"column"} spacing={1}>
            { !showTimeAndClefInput  && // do not show the control in editor - then no choice, showLilypond should be true and the textarea always shown
                <FormGroup>
                    <FormControlLabel control={<Switch sx={{marginLeft: 1.1}} size={"small"} checked={showLilypond}
                                                       onChange={() => {
                                                           setShowLilypond(!showLilypond);
                                                           if (resizeFunction) resizeFunction();
                                                       }}/>}
                                      label={t.textInput}/>
                </FormGroup>
            }
            {showLilypond && <Grid container direction={"column"} spacing={1}>
                <Grid item>{t.lilypondNotationLabel}:</Grid>
                <Grid item>
                    <textarea rows="3" cols="50" value={lyInput}
                              tabIndex={-1}
                              onKeyDown={ event => {
                                  if (event.key==="Enter" && event.ctrlKey)  {
                                      handleLyNotation();
                                  }
                              } }
                              onChange={event => setLyInput(event.target.value)}
                    />
                </Grid>
                <Grid item>
                    <Button onClick={handleLyNotation}>{t.engrave}</Button>
                </Grid>
            </Grid> }
            { showTimeAndClefInput && createHeaderRow()}
            <div tabIndex={-1} onKeyDown={onKeyDown}>
                <NotationView id="userNotation" div={"score"} notationInfo={notationInfo} selectedNote={selectedNote} setSelectedNote={setSelectedNote} t={t} />
            </div>
            {createButtonsRow()}
            {createPianoRow()}

        </Grid>
    </div>
}
