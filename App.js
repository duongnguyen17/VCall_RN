import React, {useState, useEffect, useRef} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Button,
  Dimensions,
} from 'react-native';
import {TextInput} from 'react-native-paper';
import Clipboard from '@react-native-community/clipboard';
import {io} from 'socket.io-client';
import Peer from 'react-native-peerjs';
import {
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
} from 'react-native-webrtc';
const {width, height} = Dimensions.get('screen');
const socket = io('https://video-call-0606.herokuapp.com/');
const App = () => {
  const [myName, setMyName] = useState('');
  const [myId, setMyId] = useState('');
  const [idToCall, setIdToCall] = useState('');
  const [stream, setStream] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnd, setCallEnd] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState();
  const [callerSignal, setCallerSignal] = useState();
  const myVideo = useRef();

  useEffect(() => {
    // mediaDevices.getUserMedia({video: true, audio: true}).then(stream => {
    //   setStream(stream);
    //   myVideo.current.srcObject = stream;
    // });
    getStream();
    socket.on('me', id => {
      setMyId(id);
    });
    socket.on('callUser', data => {
      setReceivingCall(true);
      setCaller(data.caller);
      setCallerSignal(data.signal);
    });
  }, []);

  const getStream = async () => {
    try {
      let isFront = true;
      const sourceInfos = await mediaDevices.enumerateDevices();
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (
          sourceInfo.kind == 'videoinput' &&
          sourceInfo.facing == (isFront ? 'front' : 'environment')
        ) {
          videoSourceId = sourceInfo.deviceId;
        }
      }
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 640,
          height: 480,
          frameRate: 30,
          facingMode: isFront ? 'user' : 'environment',
          deviceId: videoSourceId,
        },
      });
      console.log(`stream`, stream);
      setStream(stream);
      myVideo.current.srcObject = stream;
    } catch (error) {
      console.log(`error 60 App.js: `, error.message);
    }
  };
  const makeCall = () => {};
  return (
    <SafeAreaView style={styles.container}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text>My ID: {myId}</Text>
        <Button
          title="copy"
          onPress={() => {
            Clipboard.setString(myId);
          }}
        />
      </View>
      <View style={styles.videoContainer}>
        <View style={styles.video}>
          {stream && (
            <RTCView
              streamURL={stream.toURL()}
              style={{width: width, height: height / 3}}
            />
          )}
        </View>
        <View style={styles.video}>
          <Text>partnerVideo</Text>
        </View>
      </View>
      <View style={styles.handleCall}>
        <TextInput label="name" value={myName} onChangeText={setMyName} />
        <TextInput
          label="id to call"
          value={idToCall}
          onChangeText={setIdToCall}
        />
        <View style={styles.buttonCallContainer}>
          {callAccepted && !callEnd ? (
            <Button title="leave" onPress={leaveCall} />
          ) : (
            <Button
              title="call"
              onPress={() => {
                callUser(idToCall);
              }}
            />
          )}
        </View>
      </View>
      <View style={styles.partner}>
        {receivingCall && !callAccepted && (
          <View>
            <Text>{partner.name} is calling...</Text>
            <Button title="Answer" onPress={answer} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default App;
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'green',
  },
});
