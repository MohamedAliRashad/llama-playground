import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';

function TransitionAlerts() {
    const [open, setOpen] = useState(true);

    return
    <Collapse in={open}>
        <Alert onClose={() => { setOpen(false) }} color="success">This is a success alert — check it out!</Alert>
    </Collapse>;
}

export default TransitionAlerts;