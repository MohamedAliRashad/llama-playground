import { React, useState, useEffect } from 'react'
import './App.css'
import Typography from '@mui/joy/Typography';
import Textarea from '@mui/joy/Textarea';
import Button from '@mui/joy/Button';
import Container from '@mui/system/Container';
import Grid from '@mui/joy/Grid';
import CircularProgress from '@mui/joy/CircularProgress';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CloudDownloadRoundedIcon from '@mui/icons-material/CloudDownloadRounded';
import Tooltip from '@mui/joy/Tooltip';
import { textVide } from 'text-vide';

function App() {
  const [socket, setSocket] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(true);
  const [isLike, setIsLike] = useState(true);
  const [highlightedText, setHighlightedText] = useState('');

  useEffect(() => {
    const userId = new Date().getTime().toString();
    fetch('http://localhost:8040') .then(res => res.json()) .then(console.log); 
    // fetch('https://dummyjson.com/products') .then(res => res.json()) .then(console.log); 

    const newSocket = new WebSocket("ws://localhost:8040/ws/" + userId);

    newSocket.onopen = () => {
      console.log("Connection established");
      setLoading(false);
      setSocket(newSocket);
    };

    newSocket.onclose = () => {
      console.log("Connection closed");
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket error: ", error);
    };

    newSocket.onmessage = (event) => {
      setText(event.data);
    };

    return () => {
      if (newSocket.readyState === 1) { // <-- This is important
        newSocket.close();
      }
    };
  }, []);


  const handleFavoriteClick = () => {
    setIsFavorite(!isFavorite);
    console.log('isFavorite:', isFavorite);
    // if (isFavorite) {
    //   setHighlightedText(textVide(text));
    // } else {
    //   setHighlightedText('');
    // }
  };

  const handleLikeClick = () => {
    setIsLike(!isLike);
    console.log('isLike:', isLike);
  };

  const handleDownloadClick = () => {
    console.log('Downloading text:', text);
    const filename = 'llama-text.txt'; // Replace with your file name
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearClick = () => {
    setIsLike(true);
    setIsFavorite(true);
    setText('');
    setHighlightedText('');
  };

  function handleKeyPress(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function handleSubmit() {
    console.log('Submitting text:', text);
    socket.send(text)
  }

  return (
    <Container>
      <Typography level='h1' align="center"> 🦙 The LLaMA Experience 🦙</Typography>
      <Typography level='h6' align="center" sx={{color: 'green'}}> <b style={{ color: "red" }}>Ctrl+Enter</b> to make LLaMA continue your text </Typography>
      <br></br>
      <Grid container spacing={2} direction="row" justifyContent="flex-start" alignItems="flex-start" sx={{ width: '60vw' }}>
        <Grid item xs={10}>
          <Textarea
            placeholder="Enter your text here"
            disabled={loading}
            value={text}
            onChange={e => setText(e.target.value = (e.target.value).toString().slice(0,2048))}
            onKeyPress={handleKeyPress}
            maxRows={10}
            sx={{
              height: '75vh',
            }}
          />
        </Grid>
        <Grid container spacing={2} direction="column" justifyContent="flex-start" alignItems="stretch">
          <Grid item xs>
            <Tooltip title="Loving the Experience" variant="outlined" color="warning" placement="right">
              <Button variant="plain" color="neutral" onClick={handleFavoriteClick} disabled={loading}>
                {isFavorite ? <FavoriteBorderIcon /> : <FavoriteIcon style={{ color: 'red' }} />}
              </Button>
            </Tooltip>
          </Grid>
          <Grid item xs>
            <Tooltip title="Liking the output" variant="outlined" color="warning" placement="right">
              <Button variant="plain" color="neutral" onClick={handleLikeClick} disabled={loading}>
                {isLike ? <ThumbUpOffAltIcon /> : <ThumbUpIcon style={{ color: 'blue' }} />}
              </Button>
            </Tooltip>
          </Grid>
          <Grid item xs>
            <Tooltip title="Clear Everything" variant="outlined" color="warning" placement="right">
              <Button variant="outlined" color="warning" onClick={handleClearClick} disabled={loading}>
                <ClearAllIcon />
              </Button>
            </Tooltip>
          </Grid>
          <Grid item xs>
            <Tooltip title="Download Text" variant="outlined" color="success" placement="right">
              <Button variant="outlined" color="success" onClick={handleDownloadClick} disabled={loading}>
                <CloudDownloadRoundedIcon />
              </Button>
            </Tooltip>
          </Grid>
        </Grid>
        <Grid item xs={2}>
          <Tooltip title="You can also use Ctrl+Enter" variant="outlined" color="success">
            <Button variant="soft" onClick={handleSubmit} color="neutral" sx={{ width: "11vw" }} disabled={loading}> {loading ? <CircularProgress /> : "Submit"}</Button>
          </Tooltip>
        </Grid>
        <Grid item xs={2}>
          <Button variant="soft" startDecorator={<ClearAllIcon />} onClick={handleClearClick} color="warning" disabled={loading}>Clear</Button>
        </Grid>
        <Grid item xs={8}>
          <Button variant="outlined" color="success" sx={{ width: "19vw" }} onClick={handleDownloadClick} startDecorator={<CloudDownloadRoundedIcon />} disabled={loading}>
            Download
          </Button>
        </Grid>
        <Grid>
        <div
        contentEditable
        dangerouslySetInnerHTML={{__html: highlightedText}}
        />
        </Grid>
      </Grid>
    </Container>
  );
}

export default App
