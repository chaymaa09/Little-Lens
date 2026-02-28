import { useState, useRef, useEffect } from "react";
import { getWordAtTime } from "./transcriptionService";

/**
 * WordByWordDisplay Component
 * Shows word-by-word transcription with yellow highlighting synchronized to audio
 */
export function WordByWordDisplay({ 
  words = [], 
  audioUrl, 
  narrationText
}) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  // ✨ Sync word highlighting with audio playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || words.length === 0) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);

      // Get word at current time
      const { wordIndex } = getWordAtTime(words, time);
      if (wordIndex >= 0) {
        setHighlightedWordIndex(wordIndex);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setHighlightedWordIndex(-1);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [words]);

  // Jump to word when clicked
  const jumpToWord = (wordIndex) => {
    if (audioRef.current && words[wordIndex]) {
      audioRef.current.currentTime = words[wordIndex].start || 0;
      audioRef.current.play();
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If no words, show plain transcription
  if (!words || words.length === 0) {
    return (
      <div style={{ padding: "16px", background: "#f0f0f0", borderRadius: "8px" }}>
        <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "8px" }}>
          📝 Transcription
        </div>
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            style={{ width: "100%", marginBottom: "8px" }}
          />
        )}
        <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.6" }}>
          {narrationText}
        </p>
      </div>
    );
  }

  // Word-by-word display with highlighting
  return (
    <div style={{ padding: "16px", background: "#f0f0f0", borderRadius: "8px" }}>
      <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "12px" }}>
        📝 Transcription (Word-by-Word Highlighting)
      </div>

      {/* Audio Player */}
      <audio
        ref={audioRef}
        src={audioUrl}
        controls
        style={{ width: "100%", marginBottom: "12px" }}
      />

      {/* Time and Status */}
      <div style={{ fontSize: "12px", color: "#666", marginBottom: "12px" }}>
        ⏱️ {formatTime(currentTime)} / {formatTime(duration)}
        {isPlaying && <span style={{ marginLeft: "8px", color: "#FF9800" }}>▶ Playing</span>}
      </div>

      {/* Words with Highlighting */}
      <div style={{
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: "6px",
        padding: "12px",
        lineHeight: "1.8",
        fontSize: "16px",
        marginBottom: "12px",
        minHeight: "60px"
      }}>
        {words.map((wordObj, index) => (
          <span
            key={index}
            onClick={() => jumpToWord(index)}
            style={{
              // ✨ YELLOW HIGHLIGHT FOR CURRENT WORD
              backgroundColor: index === highlightedWordIndex ? "#FFD700" : "transparent",
              color: index === highlightedWordIndex ? "#000" : "#333",
              padding: "2px 6px",
              borderRadius: "3px",
              cursor: "pointer",
              transition: "all 0.1s ease",
              fontWeight: index === highlightedWordIndex ? "bold" : "normal",
              marginRight: "4px",
              display: "inline-block",
              userSelect: "none"
            }}
            title={`Jump to ${(wordObj.start || 0).toFixed(2)}s`}
          >
            {wordObj.word}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div style={{
        fontSize: "12px",
        color: "#666",
        borderTop: "1px solid #ddd",
        paddingTop: "8px"
      }}>
        📊 Total words: {words.length} | Current: {highlightedWordIndex >= 0 ? highlightedWordIndex + 1 : 0}
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: "8px",
        padding: "8px",
        background: "#e3f2fd",
        borderRadius: "4px",
        fontSize: "11px",
        color: "#1976d2",
        fontStyle: "italic"
      }}>
        💡 Click any word to jump to that moment. Yellow = current word.
      </div>
    </div>
  );
}

export default WordByWordDisplay;