import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

const Preloader = () => {
  return (
    <Box sx={{ width: '100%' }}>
      <LinearProgress 
        sx={{
          '& .MuiLinearProgress-bar': {
            backgroundColor: '#4e2348'
          }
        }}
      />
    </Box>
  )
}

export default Preloader