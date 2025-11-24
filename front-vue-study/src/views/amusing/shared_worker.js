let count = 0;
onconnect = ({ ports }) => {
  const port = ports[0];
  port.onmessage = ({ data }) => {
    count += data;
    port.postMessage(count);
  };
};
