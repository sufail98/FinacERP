import * as React from "react";
import Alert from "@mui/material/Alert";
import Slide from "@mui/material/Slide";

const AlertBox = ({ message, type }) => {
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    setOpen(false);
    const timeout = setTimeout(() => setOpen(true), 10); // force reset
    return () => clearTimeout(timeout);
  }, [message, type]); // re-trigger even for same message/type

  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setOpen(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div className="fixed max-w-[500px] top-5 right-5 z-[99999999999999999999999999999999999999999]">
      <Slide in={open} direction="down" mountOnEnter unmountOnExit>
        <Alert severity={type} variant="filled" className="shadow-lg">
          {message}
        </Alert>
      </Slide>
    </div>
  );
};


export default AlertBox;