import React, {useRef, useEffect, useState} from 'react'
import VexFlow from 'vexflow';
import {defaultNotationInfo} from './notationUtils';
import "../../styles/h5p-musical-dictations.css" ; // needed here only for testing via Preview.js


const VF = VexFlow.Flow;
const { Renderer } = VF;


export function NotationView({
                                 notationInfo = defaultNotationInfo,
                                 width = 500, // this will be expanded when notation will grow longer
                                 height = 140,
                                 staffHeight = 100,
                                 selectedNote,
                                 setSelectedNote,
                                 t
                             }) {
    const container = useRef()
    const rendererRef = useRef()

    const [staveInfo, setStaveInfo] = useState([[],[]]); // this holds vexflow objects, organised by score staves, array contanin: {vfStave, staveNotes}
    const scale = 1;



    useEffect(() => { // this is actually redraw function...
        if (rendererRef.current == null) {
            rendererRef.current = new Renderer(
                container.current,
                Renderer.Backends.SVG
            ) ;
            //  adding on click listener
            rendererRef.current.getContext().svg.onclick = (event) => handleClick(event);
        }
        const renderer = rendererRef.current;
        renderer.resize(width, height) // this has no effect with factory, it seems...
        const context = renderer.getContext();
        context.clear();
        context.setFont('Arial', 10, '').setBackgroundFillStyle('#eeeedd');

        //console.log("Selected note in draw hook: ", selectedNote);

        draw(notationInfo, context); // should we also pass renderer?

    }, [notationInfo, width, height, selectedNote]);

    useEffect( () => {
        rendererRef.current.getContext().svg.onclick = (event) => handleClick(event); // update if number of bars changed
    }, [staveInfo] );


    const setInputCursor = (x,color = "lightblue" ) => {
        const width = 25; //note.getNoteHeadEndX() - note.getNoteHeadBeginX(); // approximate notehead width
        const y = 20;//allNotes[0][0].getStave().getYForTopText()-10; // if there is the first note. How to get stave???
        const height = 100;
        rendererRef.current.getContext().rect(x,y ,width, height,
            { fill: color, opacity: "0.2" } );
    }

    const handleClick = (event) => {

        const div = container.current;
        const calculatedX = event.clientX - div.getBoundingClientRect().x + div.scrollLeft;
        //console.log("layerX, clientX, calculated , scrollLeft: ",  event.layerX, event.clientX,  calculatedX, div.scrollLeft);

        let x =calculatedX / scale;
        let y = event.layerY / scale; // may need also correction similar to calculated X
        //console.log("Clicked: ", x,y);

        // y is different when scrolled!! try to get Y from stave
        const svgY = rendererRef.current.getContext().svg.getBoundingClientRect().y  + window.scrollY ;
        //console.log(svgY);
        const clickedStaff = (y>svgY + staffHeight+20 && defaultNotationInfo.staves.length > 1 ) ? 1 : 0; // not best condition, for tryout only...

        const position = getClickPositionByX(x, clickedStaff);

        if (setSelectedNote) {
            if (position) {
                setSelectedNote(position); // this updates NotationInput or anyone else interested. OR: still, use redux???
            }
        } else {
            console.log("SetSelected not set");
        }

    };

    const setColor = (staveNote, color) => {

        // if (! staveNote.style) { // if not defined, default is black, make it red
        //     color = "red"
        // } else {
        //     color = staveNote.style.fillStyle === "red" ? "black" : "red";   // otherwise switch
        // }

        const style = {fillStyle: color, strokeStyle: color};
        staveNote.setStyle(style);
        staveNote.setStemStyle(style);
        staveNote.setFlagStyle(style);
        staveNote.setContext(rendererRef.current.getContext()).draw();
    }


    const getClickPositionByX = (x, staffIndex=0) => {

        // find which bar:
        let measureIndex = -1;
        for (let i=0; i<staveInfo[staffIndex].length; i++) {
            const vfStave = staveInfo[staffIndex][i].vfStave;
            //console.log("Stave coordinates: ", vfStave.getX(), vfStave.getNoteStartX(), vfStave.getNoteEndX(), vfStave.getWidth());
            if (x>=vfStave.getX() && x<=vfStave.getNoteEndX()) { // was .getNoteStartX, but this is wrong in bar 1
                measureIndex = i;
                console.log("Stave click in m. index ", measureIndex);
                break;
            }
        }

        if (measureIndex===-1) {
            console.log("No measure found");
            return null; // does this break something
        }

        const padding = 5 ; // N // px to left and right

        if (staveInfo[staffIndex][measureIndex].staveNotes.length===0) {
            console.log("No notes", staffIndex, measureIndex);
            return {note: -1, measure: measureIndex, staff: staffIndex}
        }


        if ( x> staveInfo[staffIndex][measureIndex].staveNotes.at(-1).getNoteHeadEndX()+padding ) {
            //console.log("click after last note in bar", measureIndex);
            return {note: -2, measure: measureIndex, staff: staffIndex}
        }

        if ( x<staveInfo[staffIndex][measureIndex].staveNotes.at(0).getNoteHeadBeginX()-padding ) {
            console.log("click before last note in bar", measureIndex);
            return {note: 0, measure: measureIndex, staff: staffIndex}
        }


        let noteIndex = -1;
        for (let i=0; i<staveInfo[staffIndex][measureIndex].staveNotes.length; i++) {
            const note = staveInfo[staffIndex][measureIndex].staveNotes[i];
            const nextNote = (i<staveInfo[staffIndex][measureIndex].staveNotes.length-1) ? staveInfo[staffIndex][measureIndex].staveNotes[i+1] : null;
            //console.log("click Note x, width: ", note.getAbsoluteX(), note.getWidth(), note.getBoundingBox(), note.getNoteHeadBeginX(), note.getNoteHeadEndX());
            if (x>= note.getNoteHeadBeginX()-padding && x<=note.getNoteHeadEndX()+padding ) {
                noteIndex = i;
            } else if (nextNote && x>note.getNoteHeadEndX()+padding && x<nextNote.getNoteHeadBeginX()-padding) {
                console.log("click In between after ", i);
                noteIndex = i + 0.5;

            }
        }
        const position = {note: noteIndex, measure: measureIndex, staff: staffIndex};
        //console.log("Clicked position: ", position);

        return position;
    };



    const draw = (notationInfo, context) => {
        //const vfStaves = [[], []]; //  NB! think of better name! this is vexflow staves actually. do we need to store them at all? -  later: define by stave count [ Array(notationIfo.staves.length ]
        const defaultWidth = 200;
        //const currentPositionInfo = [];
        const newStaveInfo = [[],[]];
        const allStaveNotes = [[],[]];
        //How can I pre-calculate the width of a voice?
        //
        // You can call Formatter.getMinTotalWidth() to return the minimum amount of horizontal space required to render a voice.

        let startY = 0;
        let startX = 10;
        const formatter = new VF.Formatter();
        let noteToHighlight = null;


        // vertical alignment: https://github.com/0xfe/vexflow/wiki/The-VexFlow-FAQ

        for (let measureIndex = 0; measureIndex < notationInfo.staves[0].measures.length; measureIndex++) { // should we check if there is equal amount of measures?
            let measureWidth = defaultWidth;
            let staffBeams = [];
            //let ties = [];

            // if (measureIndex === 0) { // OR: hasOwnProperty("clef" etc
            //   measureWidth += clefAndKeySpace;
            // }

            const voices = [];
            let necessaryWidth = 160 ; // for formatter.preCalculateMinTotalWidth

            // need to format all staves (vertically together)
            for (let staffIndex = 0; staffIndex < notationInfo.staves.length; staffIndex++) {
                const staff = notationInfo.staves[staffIndex];

                const notationMeasure = staff.measures[measureIndex];

                const newMeasure = new VF.Stave(startX, startY + staffIndex * staffHeight, measureWidth);
                //newMeasure.setMeasure(measureIndex+1);

                if (measureIndex === 0) { // OR: hasOwnProperty("clef" etc
                    newMeasure.addClef(staff.clef).addKeySignature(staff.key).addTimeSignature(staff.time);
                }

                let type = VF.Barline.type.SINGLE;
                if (staff.measures[measureIndex].endBar) {
                    switch (staff.measures[measureIndex].endBar)  {
                        case "||" : type = VF.Barline.type.DOUBLE; break;
                        case "|." : type = VF.Barline.type.END; break;
                        case ".|:" : type = VF.Barline.type.REPEAT_BEGIN; break;// this mus be actually startBarType -  fix later
                        case ":|." : type = VF.Barline.type.REPEAT_END; break;
                        case ":|.|:" : type = VF.Barline.type.REPEAT_BOTH; break;
                        default: type = VF.Barline.type.SINGLE;
                    }
                }

                if (measureIndex === staff.measures.length - 1 ) { // last bar // notationMeasure.hasOwnProperty("endBar") vms
                    type = VF.Barline.type.END;
                }
                newMeasure.setEndBarType(type);

                newStaveInfo[staffIndex][measureIndex] = {vfStave: newMeasure, staveNotes:[]};

                let staveNotes = [];

                let noteIndex = 0;
                for (let note of notationMeasure.notes) {
                    const staveNote = new VF.StaveNote(note);
                    //currentPositionInfo.push( { staveNote : staveNote, position : {note: noteIndex, measure: measureIndex, staff: staffIndex} } )

                    if (note.hasOwnProperty("color")) {
                        staveNote.setStyle({fillStyle: note.color, strokeStyle: note.color});
                    }

                    if (selectedNote && noteIndex === selectedNote.note && measureIndex === selectedNote.measure && staffIndex === selectedNote.staff) {
                        // console.log("This note should be highlighted: ", noteIndex)
                        noteToHighlight = staveNote; // to highlight it later
                    }
                    // double dot not implemented yet
                    if (note.duration.includes("d")) { //if dotted, add modifier, in case of rest it would be 4dr
                        //console.log("Dotted note!")
                        VF.Dot.buildAndAttach([staveNote], {all: true});
                    }

                    if (note.hasOwnProperty("tied") && note.tied)  {
                        staveNote.tied = true; // add this property
                    }
                    staveNotes.push(staveNote);
                    //console.log("Added to bar: ", note.keys);
                    allStaveNotes[staffIndex].push(staveNote);
                    noteIndex++;
                }

                newStaveInfo[staffIndex][measureIndex].staveNotes = staveNotes; // VÕIBOLLA -  liida hiljem kõikide taktide stavenote'id ühte jadasse ja proovi siis pided tekitada?

                const voice = new VF.Voice().setMode(VF.Voice.Mode.SOFT).addTickables(staveNotes).setStave(newMeasure);
                VF.Accidental.applyAccidentals([voice], staff.key);
                const beams = VF.Beam.applyAndGetBeams(voice);
                staffBeams = staffBeams.concat(beams);
                formatter.joinVoices([voice]);
                voices[staffIndex] = voice;
                // kind of works but needs more work - clefAndKeySpace -  find out by the key (how many accidentals, use minimum bar width (measureWidth)
                // find out width that is used also for formatter.format.
                // NB! Test with two-staff notation!

                // does not work, since there is more and more notes in the voice and necessaryWidth gets bigger, something wrong here..
                //necessaryWidth = formatter.preCalculateMinTotalWidth([voice]) * 1.5;
                necessaryWidth = notationMeasure.notes.length * 40 ; // just calculate the space by number of notes...
                if (measureIndex === 0) {
                    measureWidth = newMeasure.getNoteStartX() + necessaryWidth + 20; // 20 a bit of extra space
                } else {
                    measureWidth = necessaryWidth + 40;
                }
                //if (measureIndex === 0) measureWidth += clefAndKeySpace;
                //console.log("measureWidth: ", necessaryWidth, measureWidth, newMeasure.getNoteStartX());
                // if (testWidth>100) {
                //   measureWidth += testWidth;
                // }
                //
                newMeasure.setWidth( measureWidth);
                newMeasure.setContext(context).draw();

            }

            //console.log("necessary w. befor formattter.format", necessaryWidth);
            formatter.format(voices, necessaryWidth);
            // let testWidth = formatter.getMinTotalWidth();
            // console.log("minTotalWidth: ", testWidth);

            voices.forEach((v) => v.setContext(context).draw());
            staffBeams.forEach((beam) => beam.setContext(context).draw());

            // and other drawings -  ties, tuplets, slurs etc

            // ties.forEach((t) => {
            //     t.setContext(context).draw();
            // });


            // staveconnector
            if (notationInfo.staves.length>1) {
                if (notationInfo.staves.length>1) { // add Connector
                    const connector = new VF.StaveConnector(newStaveInfo[0][0].vfStave, newStaveInfo.at(-1)[0].vfStave); // NB! Needs testing
                    connector.setType(VF.StaveConnector.type.BOLD_DOUBLE_LEFT);
                    connector.setContext(context).draw();
                }
            }
            startX += measureWidth;
            if (startX>width) {
                //console.log("the width grew too big!", startX);
                rendererRef.current.resize(startX+40, height);
            }
        }

        // draw ties. Mus happen after all notes are set for cross bar  ties

        for (let i=0; i<notationInfo.staves.length;i++) { // walk through all stavenotes notes by staves until the penultimate note
            for (let j=0; j<allStaveNotes[i].length-1; j++) {
                const note =  allStaveNotes[i][j];
                if (note.tied && note.tied===true && note.keys[0] === allStaveNotes[i][j+1].keys[0]) { // chords not supported
                    //console.log("Found tied note", note, i, j);
                    const tie = new VF.StaveTie( {
                                    first_note: note, // kui see takti viimane
                                    last_note: allStaveNotes[i][j+1], // siis see peaks olema järgmise takti esimene
                                    first_indices: [0],
                                    last_indices: [0],
                                }  );
                    tie.setContext(context).draw();
                }
            }
        }


        // draw selected note cursor/highlight the note if any:
        let cursorX = -1, cursorColor="lightblue";
        if (noteToHighlight) {
            cursorX = noteToHighlight.getNoteHeadBeginX()-5;
        } else if (selectedNote)  {
            if (newStaveInfo[selectedNote.staff][selectedNote.measure] && selectedNote && selectedNote.note<0) { // last note
                if ( newStaveInfo[selectedNote.staff][selectedNote.measure].staveNotes.length===0) {
                    cursorX = newStaveInfo[selectedNote.staff][selectedNote.measure].vfStave.getNoteStartX() + 10; // if not notes in the bar, draw it in the beginning
                    //console.log("Empty bar",selectedNote.measure )
                } else {
                    cursorX = newStaveInfo[selectedNote.staff][selectedNote.measure].staveNotes.at(-1).getNoteHeadEndX() + 5;
                    //console.log("After last note",selectedNote.measure  )

                }
            } else if  (selectedNote && selectedNote.note-parseInt(selectedNote.note) === 0.5) { // in between
                cursorX = newStaveInfo[selectedNote.staff][selectedNote.measure].staveNotes[ parseInt(selectedNote.note) ].getNoteHeadEndX() + 5;
                cursorColor = "lightgreen";
            }
        }

        if (cursorX>=0) {
            //console.log("Draw cursor at ", cursorX);
            setInputCursor(cursorX, cursorColor);
        }

        setStaveInfo(newStaveInfo);
    }

    return <div className={"h5p-musical-dictations-notationDiv"} ref={container} />
}
