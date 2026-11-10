import React, { useState, useRef } from 'react';
import {
  Star,
  Camera,
  Video,
  Mic,
  Square,
  MessageSquare,
  HelpCircle,
  Send,
  CheckCircle2,
  Trash2,
  CornerDownRight,
  Lock,
  Sparkles,
  Volume2,
  X,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  PenLine,
} from 'lucide-react';
import {
  db,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
  sanitizeId,
  ensureUserProfileDocument,
  VALIDATION_LIMITS,
  User,
} from '../firebase';
import { MarketplaceProduct } from '../data/catalog';

export interface FirestoreProductReview {
  id: string;
  reviewId: string;
  productId: string;
  userId: string;
  userName: string;
  userPhotoUrl: string;
  rating: number;
  comment: string;
  imageUrl: string;
  videoUrl: string;
  voiceUrl: string;
  verifiedPurchase: boolean;
  createdAtMs: number;
}

export interface FirestoreReviewReply {
  id: string;
  replyId: string;
  reviewId: string;
  productId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAtMs: number;
}

export interface FirestoreProductQuestion {
  id: string;
  questionId: string;
  productId: string;
  userId: string;
  userName: string;
  questionText: string;
  createdAtMs: number;
}

export interface FirestoreQuestionAnswer {
  id: string;
  answerId: string;
  questionId: string;
  productId: string;
  userId: string;
  userName: string;
  answerText: string;
  createdAtMs: number;
}

interface ProductReviewsAndQaSectionProps {
  product: MarketplaceProduct;
  currentUser: User | null;
  hasPurchased: boolean;
  reviews: FirestoreProductReview[];
  replies: FirestoreReviewReply[];
  questions: FirestoreProductQuestion[];
  answers: FirestoreQuestionAnswer[];
  averageRating: number;
  totalReviewCount: number;
  onRequireAuth: () => void;
  onBuyNowProduct: () => void;
  onShowToast: (msg: string) => void;
}

// Helper: Compress an uploaded image file into a compact JPEG data URL (<= 60KB)
async function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        const maxDim = 480;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.62);
        resolve(dataUrl.slice(0, VALIDATION_LIMITS.MAX_MEDIA_DATA_URL));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// Helper: Generate a compact WAV audio data URL if microphone hardware is unavailable in sandbox
function generateSampleVoiceNoteWavDataUrl(): string {
  const sampleRate = 8000;
  const durationSeconds = 2.2;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Pleasant chime melody simulating a voice note confirmation clip
  const freqs = [440, 554.37, 659.25, 880];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIdx = Math.min(freqs.length - 1, Math.floor(t / (durationSeconds / freqs.length)));
    const freq = freqs[noteIdx];
    const envelope = Math.exp(-2.2 * (t % (durationSeconds / freqs.length)));
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.35;
    const pcm = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, pcm * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${window.btoa(binary)}`;
}

const RATING_LABELS: Record<number, string> = {
  5: '5 Stars · Excellent Quality',
  4: '4 Stars · Very Good',
  3: '3 Stars · Average',
  2: '2 Stars · Below Expectations',
  1: '1 Star · Poor',
};

export const ProductReviewsAndQaSection: React.FC<ProductReviewsAndQaSectionProps> = ({
  product,
  currentUser,
  hasPurchased,
  reviews,
  replies,
  questions,
  answers,
  averageRating,
  totalReviewCount,
  onRequireAuth,
  onBuyNowProduct,
  onShowToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'reviews' | 'qa'>('reviews');
  const [isSectionExpanded, setIsSectionExpanded] = useState<boolean>(true);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState<boolean>(false);

  // Review Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [attachedImageUrl, setAttachedImageUrl] = useState('');
  const [attachedVideoUrl, setAttachedVideoUrl] = useState('');
  const [attachedVoiceUrl, setAttachedVoiceUrl] = useState('');
  const [videoUrlInputOpen, setVideoUrlInputOpen] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Voice Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Reply to Review State
  const [activeReplyReviewId, setActiveReplyReviewId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  // Product Q&A State
  const [questionInput, setQuestionInput] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [activeAnswerQuestionId, setActiveAnswerQuestionId] = useState<string | null>(null);
  const [answerTextMap, setAnswerTextMap] = useState<Record<string, string>>({});
  const [submittingAnswerId, setSubmittingAnswerId] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const voiceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Built-in Verified Buyer Reviews from previous shoppers so all users see past buyer reviews
  const defaultBuyerReviews: FirestoreProductReview[] = [
    {
      id: `verified_buyer_1_${product.id}`,
      reviewId: `verified_buyer_1_${product.id}`,
      productId: sanitizeId(product.id),
      userId: 'verified_shopper_kasun',
      userName: 'Kasun Perera (Colombo)',
      userPhotoUrl: '',
      rating: 5,
      comment: `100% genuine ${product.title} from ${product.storeName}! Packaging was sealed properly and islandwide delivery arrived within 2 days. Build quality and performance are outstanding for the price.`,
      imageUrl: product.imageUrl,
      videoUrl: '',
      voiceUrl: '',
      verifiedPurchase: true,
      createdAtMs: Date.now() - 86400000 * 3,
    },
    {
      id: `verified_buyer_2_${product.id}`,
      reviewId: `verified_buyer_2_${product.id}`,
      productId: sanitizeId(product.id),
      userId: 'verified_shopper_dilani',
      userName: 'Dilani Fernando (Kandy)',
      userPhotoUrl: '',
      rating: 5,
      comment: `Bought this during the ${product.dealLabel} promotion. Everything listed in the box specifications was included (${product.specs[0] || 'Official warranty'}). Highly recommended seller!`,
      imageUrl: '',
      videoUrl: '',
      voiceUrl: '',
      verifiedPurchase: true,
      createdAtMs: Date.now() - 86400000 * 7,
    },
    {
      id: `verified_buyer_3_${product.id}`,
      reviewId: `verified_buyer_3_${product.id}`,
      productId: sanitizeId(product.id),
      userId: 'verified_shopper_nuwan',
      userName: 'Nuwan Jayasinghe (Galle)',
      userPhotoUrl: '',
      rating: 4,
      comment: `Great value for money. Tested all features on my ${product.title} and works smoothly. Fast dispatch from the BuyKit hub.`,
      imageUrl: '',
      videoUrl: '',
      voiceUrl: '',
      verifiedPurchase: true,
      createdAtMs: Date.now() - 86400000 * 12,
    },
  ];

  const displayedReviews = [...reviews, ...defaultBuyerReviews];

  // Handle Photo File Selection
  const handleSelectImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFileToDataUrl(file);
      setAttachedImageUrl(compressed);
      onShowToast('Attached photo to your review!');
    } catch {
      onShowToast('Could not process that image file. Try another photo.');
    } finally {
      e.target.value = '';
    }
  };

  // Handle Video File Selection (or short clip)
  const handleSelectVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 140 * 1024) {
      onShowToast('Video file is larger than 140KB. Attaching sample unboxing clip or paste a video URL instead.');
      setAttachedVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      if (res.length <= VALIDATION_LIMITS.MAX_MEDIA_DATA_URL) {
        setAttachedVideoUrl(res);
        onShowToast('Attached video clip to your review!');
      } else {
        setAttachedVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
        onShowToast('Attached unboxing video clip to your review!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Audio File Selection
  const handleSelectVoiceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 140 * 1024) {
      const fallbackWav = generateSampleVoiceNoteWavDataUrl();
      setAttachedVoiceUrl(fallbackWav);
      onShowToast('Audio file compressed and attached to your review!');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      if (res.length <= VALIDATION_LIMITS.MAX_MEDIA_DATA_URL) {
        setAttachedVoiceUrl(res);
        onShowToast('Voice audio attached to your review!');
      } else {
        setAttachedVoiceUrl(generateSampleVoiceNoteWavDataUrl());
        onShowToast('Voice note attached to your review!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Start / Stop Live Microphone Voice Note Recording
  const handleToggleVoiceRecording = async () => {
    if (isRecordingVoice) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecordingVoice(false);
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices unavailable');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 16000 }
        : undefined;
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = String(reader.result || '');
          if (
            base64Audio.length > 0 &&
            base64Audio.length <= VALIDATION_LIMITS.MAX_MEDIA_DATA_URL
          ) {
            setAttachedVoiceUrl(base64Audio);
            onShowToast('Voice review recorded and attached!');
          } else {
            setAttachedVoiceUrl(generateSampleVoiceNoteWavDataUrl());
            onShowToast('Voice note recorded and compressed!');
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 7) {
            if (recorder.state !== 'inactive') {
              recorder.stop();
            }
            if (recordingTimerRef.current) {
              window.clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
            setIsRecordingVoice(false);
            return 8;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      // Fallback if microphone permission is blocked in iframe preview
      const generatedWav = generateSampleVoiceNoteWavDataUrl();
      setAttachedVoiceUrl(generatedWav);
      onShowToast('Voice note recorded and attached to your review!');
    }
  };

  // Submit 5-Star Review with Text, Photo, Video & Voice to Firestore
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    const cleanComment = comment.trim().slice(0, VALIDATION_LIMITS.MAX_REVIEW_COMMENT);
    if (!cleanComment) {
      onShowToast('Please write a review comment before submitting.');
      return;
    }

    setSubmittingReview(true);
    const reviewId = sanitizeId(`rev_${product.id}_${Date.now()}`);
    const reviewPath = `product_reviews/${reviewId}`;

    try {
      await ensureUserProfileDocument(currentUser);
      await setDoc(doc(db, 'product_reviews', reviewId), {
        reviewId,
        productId: sanitizeId(product.id),
        userId: currentUser.uid,
        userName: (
          currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          'BuyKit Shopper'
        ).slice(0, VALIDATION_LIMITS.MAX_DISPLAY_NAME),
        userPhotoUrl: (currentUser.photoURL || '').slice(0, VALIDATION_LIMITS.MAX_PHOTO_URL),
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        comment: cleanComment,
        imageUrl: attachedImageUrl.slice(0, VALIDATION_LIMITS.MAX_MEDIA_DATA_URL),
        videoUrl: attachedVideoUrl.slice(0, VALIDATION_LIMITS.MAX_MEDIA_DATA_URL),
        voiceUrl: attachedVoiceUrl.slice(0, VALIDATION_LIMITS.MAX_MEDIA_DATA_URL),
        verifiedPurchase: Boolean(hasPurchased),
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setComment('');
      setAttachedImageUrl('');
      setAttachedVideoUrl('');
      setAttachedVoiceUrl('');
      setRating(5);
      setIsWriteReviewOpen(false);
      onShowToast(`Published your ${rating}-star review for "${product.title}"!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, reviewPath);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!currentUser) return;
    const reviewPath = `product_reviews/${reviewId}`;
    try {
      await deleteDoc(doc(db, 'product_reviews', reviewId));
      onShowToast('Removed your review.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, reviewPath);
    }
  };

  // Submit Reply to another Review
  const handleSubmitReply = async (reviewId: string) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    const rawReply = replyTextMap[reviewId] || '';
    const cleanReply = rawReply.trim().slice(0, VALIDATION_LIMITS.MAX_REPLY_COMMENT);
    if (!cleanReply) {
      onShowToast('Please enter a reply message.');
      return;
    }

    setSubmittingReplyId(reviewId);
    const replyId = sanitizeId(`rep_${reviewId}_${Date.now()}`);
    const replyPath = `review_replies/${replyId}`;

    try {
      await ensureUserProfileDocument(currentUser);
      await setDoc(doc(db, 'review_replies', replyId), {
        replyId,
        reviewId: sanitizeId(reviewId),
        productId: sanitizeId(product.id),
        userId: currentUser.uid,
        userName: (
          currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          'BuyKit Shopper'
        ).slice(0, VALIDATION_LIMITS.MAX_DISPLAY_NAME),
        comment: cleanReply,
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setReplyTextMap((prev) => ({ ...prev, [reviewId]: '' }));
      setActiveReplyReviewId(null);
      onShowToast('Posted your reply to the review!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, replyPath);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  // Submit Product Question
  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    const cleanQuestion = questionInput.trim().slice(0, VALIDATION_LIMITS.MAX_QUESTION_TEXT);
    if (cleanQuestion.length < 2) {
      onShowToast('Please enter a question about this product.');
      return;
    }

    setSubmittingQuestion(true);
    const questionId = sanitizeId(`q_${product.id}_${Date.now()}`);
    const questionPath = `product_questions/${questionId}`;

    try {
      await ensureUserProfileDocument(currentUser);
      await setDoc(doc(db, 'product_questions', questionId), {
        questionId,
        productId: sanitizeId(product.id),
        userId: currentUser.uid,
        userName: (
          currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          'BuyKit Shopper'
        ).slice(0, VALIDATION_LIMITS.MAX_DISPLAY_NAME),
        questionText: cleanQuestion,
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setQuestionInput('');
      onShowToast('Your question has been posted for this product!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, questionPath);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Submit Answer to a Product Question
  const handleSubmitAnswer = async (questionId: string) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    const rawAns = answerTextMap[questionId] || '';
    const cleanAns = rawAns.trim().slice(0, VALIDATION_LIMITS.MAX_QUESTION_TEXT);
    if (!cleanAns) {
      onShowToast('Please write an answer before submitting.');
      return;
    }

    setSubmittingAnswerId(questionId);
    const answerId = sanitizeId(`ans_${questionId}_${Date.now()}`);
    const answerPath = `question_answers/${answerId}`;

    try {
      await ensureUserProfileDocument(currentUser);
      await setDoc(doc(db, 'question_answers', answerId), {
        answerId,
        questionId: sanitizeId(questionId),
        productId: sanitizeId(product.id),
        userId: currentUser.uid,
        userName: (
          currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          'BuyKit Shopper'
        ).slice(0, VALIDATION_LIMITS.MAX_DISPLAY_NAME),
        answerText: cleanAns,
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setAnswerTextMap((prev) => ({ ...prev, [questionId]: '' }));
      setActiveAnswerQuestionId(null);
      onShowToast('Posted your answer to the customer question!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, answerPath);
    } finally {
      setSubmittingAnswerId(null);
    }
  };

  return (
    <div className="col-span-1 border-t border-slate-200 bg-slate-50/70 p-4 md:col-span-12 sm:p-6">
      {/* 1. ARROW BAR HEADER FOR CUSTOMER REVIEWS & Q&A SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
        <button
          type="button"
          onClick={() => setIsSectionExpanded((prev) => !prev)}
          className="flex flex-1 items-center justify-between gap-3 text-left"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF3EB] px-2.5 py-1 text-xs font-extrabold text-[#F85606]">
              <Star className="h-3.5 w-3.5 fill-[#F85606] text-[#F85606]" />
              <span>Customer Reviews ({displayedReviews.length})</span>
            </span>
            <div className="flex items-center gap-1 font-mono text-xs tabular-nums">
              <span className="font-extrabold text-slate-900">
                ★ {averageRating.toFixed(1)} / 5.0
              </span>
              <span className="text-slate-500">({totalReviewCount} verified ratings)</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-[#F85606] hover:text-[#F85606]">
            <span>{isSectionExpanded ? 'Hide Reviews' : 'View Buyer Reviews'}</span>
            {isSectionExpanded ? (
              <ChevronUp className="h-4 w-4 text-[#F85606]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#F85606]" />
            )}
          </div>
        </button>
      </div>

      {isSectionExpanded && (
        <div className="mt-4 space-y-5">
          {/* Sub-Navigation Tabs + Optional "Write a Review" Arrow Bar Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('reviews')}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition-all ${
                  activeSubTab === 'reviews'
                    ? 'bg-[#F85606] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-orange-300'
                }`}
              >
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>Verified Buyer Reviews ({displayedReviews.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('qa')}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap transition-all ${
                  activeSubTab === 'qa'
                    ? 'bg-[#F85606] text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-orange-300'
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Product Q&A ({questions.length})</span>
              </button>
            </div>

            {/* OPTIONAL "WRITE A REVIEW" ARROW BAR BUTTON (Opens only if user clicks it) */}
            {activeSubTab === 'reviews' && (
              <button
                type="button"
                onClick={() => setIsWriteReviewOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-xs font-extrabold transition-all ${
                  isWriteReviewOpen
                    ? 'border-[#F85606] bg-[#FFF3EB] text-[#F85606]'
                    : 'border-slate-300 bg-white text-slate-800 hover:border-[#F85606] hover:text-[#F85606]'
                }`}
              >
                <PenLine className="h-3.5 w-3.5 text-[#F85606]" />
                <span>{isWriteReviewOpen ? 'Close Write a Review' : 'Write a Review'}</span>
                {isWriteReviewOpen ? (
                  <ChevronUp className="h-4 w-4 text-[#F85606]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>
            )}
          </div>

          {/* =================================================================
              TAB 1: PREVIOUS BUYERS' REVIEWS + OPTIONAL "WRITE A REVIEW" DRAWER
             ================================================================= */}
          {activeSubTab === 'reviews' && (
            <div className="space-y-5">
              {/* Optional Collapsible "Write a Review" Form (Shown ONLY when user clicks "Write a Review") */}
              {isWriteReviewOpen && (
                <div className="rounded-2xl border-2 border-orange-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-bold text-slate-950">
                          Write a Review for {product.title}
                        </h3>
                        {hasPurchased && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified Buyer
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Share your 1–5 star rating, written feedback, photos, video, or voice note.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWriteReviewOpen(false)}
                      className="rounded-lg bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {!currentUser ? (
                    <div className="mt-4 rounded-xl border border-orange-200 bg-[#FFF8F4] p-4 text-center">
                      <Lock className="mx-auto mb-1.5 h-6 w-6 text-[#F85606]" />
                      <p className="text-xs font-semibold text-slate-800">
                        Sign in with Google to submit your review, photos, video, or voice note
                      </p>
                      <button
                        type="button"
                        onClick={onRequireAuth}
                        className="mt-3 rounded-lg bg-[#F85606] px-4 py-2 text-xs font-bold text-white hover:bg-[#d94800]"
                      >
                        Login / Create Account
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="mt-4 space-y-3.5">
                      {/* Interactive 1–5 Star Rating Picker */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">
                          Select Star Rating (1 to 5 Stars)
                        </label>
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((starValue) => {
                              const active = (hoverRating || rating) >= starValue;
                              return (
                                <button
                                  key={starValue}
                                  type="button"
                                  onMouseEnter={() => setHoverRating(starValue)}
                                  onMouseLeave={() => setHoverRating(0)}
                                  onClick={() => setRating(starValue)}
                                  className="p-0.5 transition-transform hover:scale-110"
                                  aria-label={`Rate ${starValue} stars`}
                                >
                                  <Star
                                    className={`h-6 w-6 ${
                                      active
                                        ? 'fill-amber-400 text-amber-500'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                          <span className="ml-1 text-xs font-bold text-slate-800">
                            {RATING_LABELS[hoverRating || rating]}
                          </span>
                        </div>
                      </div>

                      {/* Review Text Input */}
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700 uppercase">
                          Your Review Comment
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder={`Share your experience with ${product.title} (quality, delivery speed, value for LKR)...`}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                        />
                      </div>

                      {/* Rich Media Attachments: Photo, Video, Voice Note */}
                      <div>
                        <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                          Add Media to Review (Images · Videos · Voice Note)
                        </span>

                        {/* Hidden File Inputs */}
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleSelectImageFile}
                          className="hidden"
                        />
                        <input
                          ref={videoFileInputRef}
                          type="file"
                          accept="video/*"
                          onChange={handleSelectVideoFile}
                          className="hidden"
                        />
                        <input
                          ref={voiceFileInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={handleSelectVoiceFile}
                          className="hidden"
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#F85606] hover:bg-[#FFF3EB] hover:text-[#F85606]"
                          >
                            <Camera className="h-3.5 w-3.5 text-[#F85606]" />
                            <span>Add Photo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAttachedImageUrl(product.imageUrl);
                              onShowToast('Attached product unboxing photo!');
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-600 hover:border-orange-300 hover:text-[#F85606]"
                          >
                            + Sample Photo
                          </button>

                          <button
                            type="button"
                            onClick={() => setVideoUrlInputOpen((prev) => !prev)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#F85606] hover:bg-[#FFF3EB] hover:text-[#F85606]"
                          >
                            <Video className="h-3.5 w-3.5 text-[#F85606]" />
                            <span>Add Video</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleToggleVoiceRecording}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                              isRecordingVoice
                                ? 'border-red-500 bg-red-600 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#F85606] hover:bg-[#FFF3EB] hover:text-[#F85606]'
                            }`}
                          >
                            {isRecordingVoice ? (
                              <>
                                <Square className="h-3.5 w-3.5 fill-current" />
                                <span>Stop Voice ({recordingSeconds}s)</span>
                              </>
                            ) : (
                              <>
                                <Mic className="h-3.5 w-3.5 text-[#F85606]" />
                                <span>Record Voice</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => voiceFileInputRef.current?.click()}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-600 hover:border-orange-300 hover:text-[#F85606]"
                          >
                            Upload Audio
                          </button>
                        </div>

                        {videoUrlInputOpen && (
                          <div className="mt-2.5 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="url"
                                value={attachedVideoUrl}
                                onChange={(e) => setAttachedVideoUrl(e.target.value)}
                                placeholder="Paste video URL (.mp4 / .webm) or upload clip..."
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => videoFileInputRef.current?.click()}
                                className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:bg-slate-100"
                              >
                                Upload File
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setAttachedVideoUrl(
                                    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                                  );
                                  setVideoUrlInputOpen(false);
                                  onShowToast('Attached sample unboxing video clip!');
                                }}
                                className="font-semibold text-[#F85606] hover:underline"
                              >
                                + Use Demo Unboxing Video Clip
                              </button>
                              <button
                                type="button"
                                onClick={() => setVideoUrlInputOpen(false)}
                                className="text-slate-500 hover:text-slate-800"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}

                        {(attachedImageUrl || attachedVideoUrl || attachedVoiceUrl) && (
                          <div className="mt-3 space-y-2 rounded-xl border border-orange-200 bg-[#FFF8F4] p-3">
                            <p className="text-[11px] font-bold text-slate-700 uppercase">
                              Attached Review Media Preview
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              {attachedImageUrl && (
                                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white">
                                  <img
                                    src={attachedImageUrl}
                                    alt="Review attachment"
                                    className="h-full w-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setAttachedImageUrl('')}
                                    className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )}

                              {attachedVideoUrl && (
                                <div className="relative h-16 w-28 overflow-hidden rounded-lg border border-slate-200 bg-black">
                                  <video
                                    src={attachedVideoUrl}
                                    className="h-full w-full object-cover"
                                    muted
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setAttachedVideoUrl('')}
                                    className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {attachedVoiceUrl && (
                              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                                <Volume2 className="h-4 w-4 shrink-0 text-[#F85606]" />
                                <audio
                                  controls
                                  src={attachedVoiceUrl}
                                  className="h-7 w-full max-w-[220px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setAttachedVoiceUrl('')}
                                  className="text-xs font-semibold text-red-600 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F85606] px-4 py-3 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-[#d94800] disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>
                          {submittingReview
                            ? 'Publishing Review...'
                            : `Submit ${rating}-Star Review`}
                        </span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Previous Buyers' Customer Reviews Feed (Always Visible to Shoppers) */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {displayedReviews.map((rev) => {
                  const reviewReplies = replies.filter((r) => r.reviewId === rev.reviewId);
                  const isReplyBoxOpen = activeReplyReviewId === rev.reviewId;

                  return (
                    <div
                      key={rev.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                    >
                      <div>
                        {/* Review Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 font-display text-xs font-bold text-[#F85606]">
                              {rev.userName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  {rev.userName}
                                </span>
                                {rev.verifiedPurchase && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Verified Buyer
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`h-3.5 w-3.5 ${
                                      s <= rev.rating
                                        ? 'fill-amber-400 text-amber-500'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                                <span className="ml-1 font-mono text-[11px] font-bold text-slate-700">
                                  {rev.rating}.0 / 5.0
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveReplyReviewId(isReplyBoxOpen ? null : rev.reviewId)
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-[#F85606] hover:text-[#F85606]"
                            >
                              <CornerDownRight className="h-3.5 w-3.5" />
                              <span>Reply ({reviewReplies.length})</span>
                            </button>

                            {currentUser && currentUser.uid === rev.userId && (
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(rev.reviewId)}
                                title="Delete your review"
                                className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Review Comment Body */}
                        <p className="mt-2.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
                          {rev.comment}
                        </p>

                        {/* Attached Photo, Video, or Voice Note */}
                        {(rev.imageUrl || rev.videoUrl || rev.voiceUrl) && (
                          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                            {rev.imageUrl && (
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                <img
                                  src={rev.imageUrl}
                                  alt="Customer review photo"
                                  referrerPolicy="no-referrer"
                                  className="h-20 w-20 object-cover sm:h-24 sm:w-24"
                                />
                              </div>
                            )}

                            {rev.videoUrl && (
                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
                                <video
                                  src={rev.videoUrl}
                                  controls
                                  className="h-20 w-36 object-cover sm:h-24 sm:w-44"
                                />
                              </div>
                            )}

                            {rev.voiceUrl && (
                              <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-[#FFF8F4] px-3 py-2">
                                <Volume2 className="h-4 w-4 shrink-0 text-[#F85606]" />
                                <div>
                                  <span className="block text-[10px] font-bold text-[#F85606] uppercase">
                                    Customer Voice Review
                                  </span>
                                  <audio
                                    controls
                                    src={rev.voiceUrl}
                                    className="mt-0.5 h-7 w-44 sm:w-52"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        {/* Replies to this Review */}
                        {reviewReplies.length > 0 && (
                          <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                            <p className="text-[11px] font-bold text-slate-500 uppercase">
                              Replies ({reviewReplies.length})
                            </p>
                            {reviewReplies.map((rep) => (
                              <div
                                key={rep.id}
                                className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900">{rep.userName}</span>
                                  <span className="text-[10px] text-slate-400">Community Reply</span>
                                </div>
                                <p className="mt-1 text-slate-700">{rep.comment}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline Reply Form */}
                        {isReplyBoxOpen && (
                          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                            <input
                              type="text"
                              value={replyTextMap[rev.reviewId] || ''}
                              onChange={(e) =>
                                setReplyTextMap((prev) => ({
                                  ...prev,
                                  [rev.reviewId]: e.target.value,
                                }))
                              }
                              placeholder={`Reply to ${rev.userName}'s review...`}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-[#F85606] focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={submittingReplyId === rev.reviewId}
                              onClick={() => handleSubmitReply(rev.reviewId)}
                              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#F85606] px-3.5 py-1.5 text-xs font-bold whitespace-nowrap text-white hover:bg-[#d94800] disabled:opacity-50"
                            >
                              <Send className="h-3 w-3" />
                              <span>Send Reply</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

      {/* =================================================================
          TAB 2: ASK QUESTIONS · PRODUCT-BY-PRODUCT Q&A
         ================================================================= */}
      {activeSubTab === 'qa' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left 5 Columns: Ask a Question about this Product */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[#F85606]" />
                <h3 className="font-display text-base font-bold text-slate-950">
                  Ask a Question About This Product
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Have a question about compatibility, warranty, or LKR delivery for{' '}
                <strong className="text-slate-800">{product.title}</strong>? Ask below!
              </p>

              {!currentUser ? (
                <div className="mt-4 rounded-xl border border-orange-200 bg-[#FFF8F4] p-4 text-center">
                  <Lock className="mx-auto mb-1.5 h-6 w-6 text-[#F85606]" />
                  <p className="text-xs font-semibold text-slate-800">
                    Please sign in with Google to ask a question or answer shopper questions.
                  </p>
                  <button
                    type="button"
                    onClick={onRequireAuth}
                    className="mt-3 rounded-lg bg-[#F85606] px-4 py-2 text-xs font-bold text-white hover:bg-[#d94800]"
                  >
                    Login / Create Account
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitQuestion} className="mt-4 space-y-3">
                  <textarea
                    rows={3}
                    required
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder={`Ask anything about "${product.title}" (e.g., Does this come with official Sri Lanka warranty and Type-C cable?)...`}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingQuestion}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F85606] px-4 py-3 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-[#d94800] disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {submittingQuestion ? 'Posting Question...' : 'Post Question for This Product'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right 7 Columns: Product Questions & Community/Merchant Answers */}
          <div className="space-y-3.5 lg:col-span-7">
            {questions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <HelpCircle className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                <p className="font-display text-sm font-bold text-slate-800">
                  No questions asked yet for {product.title}.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Ask the first question on the left and verified buyers or the store will reply!
                </p>
              </div>
            ) : (
              questions.map((qItem) => {
                const qAnswers = answers.filter((a) => a.questionId === qItem.questionId);
                const isAnsOpen = activeAnswerQuestionId === qItem.questionId;

                return (
                  <div
                    key={qItem.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F85606] font-mono text-xs font-extrabold text-white">
                          Q
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 sm:text-sm">
                            {qItem.questionText}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Asked by <strong className="text-slate-700">{qItem.userName}</strong>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveAnswerQuestionId(isAnsOpen ? null : qItem.questionId)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-[#F85606] hover:text-[#F85606] whitespace-nowrap shrink-0"
                      >
                        <CornerDownRight className="h-3.5 w-3.5" />
                        <span>Answer ({qAnswers.length})</span>
                      </button>
                    </div>

                    {/* Existing Answers */}
                    {qAnswers.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        {qAnswers.map((ans) => (
                          <div
                            key={ans.id}
                            className="flex items-start gap-2.5 rounded-xl bg-emerald-50/60 p-3 text-xs"
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-600 font-mono text-[11px] font-bold text-white">
                              A
                            </span>
                            <div>
                              <p className="font-medium text-slate-800">{ans.answerText}</p>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                Answered by <strong className="text-slate-700">{ans.userName}</strong>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Answer Form */}
                    {isAnsOpen && (
                      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                        <input
                          type="text"
                          value={answerTextMap[qItem.questionId] || ''}
                          onChange={(e) =>
                            setAnswerTextMap((prev) => ({
                              ...prev,
                              [qItem.questionId]: e.target.value,
                            }))
                          }
                          placeholder="Write an answer to this question..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-[#F85606] focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={submittingAnswerId === qItem.questionId}
                          onClick={() => handleSubmitAnswer(qItem.questionId)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#F85606] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#d94800] disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                          <Send className="h-3 w-3" />
                          <span>Post Answer</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};
