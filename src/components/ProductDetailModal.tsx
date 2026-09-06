import React, { useState, useEffect, useMemo } from 'react';
import { Product, Review, CurrencyCode } from '../types';
import { 
  X, 
  Star, 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  ShoppingCart, 
  Sparkles, 
  Play, 
  Check, 
  Zap, 
  Clock, 
  Award,
  Store,
  Heart,
  MessageSquare,
  UserCheck,
  BookOpen,
  Share2,
  ZoomIn,
  Bell,
  CheckCircle2,
  Lock,
  ThumbsUp,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { INITIAL_REVIEWS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { getReviewsForProductFromFirestore, addReviewToFirestore, voteReviewHelpfulInFirestore } from '../lib/firestoreService';
import { AffiliateLinkModal } from './AffiliateLinkModal';
import { EbookLightboxModal } from './EbookLightboxModal';
import { SetPriceAlertModal } from './SetPriceAlertModal';
import { formatCurrency } from '../lib/currency';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onAskAI: (query: string) => void;
  onCompare: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  onSetPriceAlert?: (product: Product) => void;
  onProductUpdated?: (updatedProduct: Product) => void;
  onSignInRequested?: () => void;
  isInWishlist?: boolean;
  hasPriceAlert?: boolean;
  currentCurrency?: CurrencyCode;
}

const RATING_LABELS: Record<number, string> = {
  5: '5 - Exceptional / Highly Recommended',
  4: '4 - Very Good Quality',
  3: '3 - Average / Meets Expectations',
  2: '2 - Below Expectations',
  1: '1 - Poor / Unsatisfactory'
};

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onAskAI,
  onCompare,
  onToggleWishlist,
  onSetPriceAlert,
  onProductUpdated,
  onSignInRequested,
  isInWishlist = false,
  hasPriceAlert = false,
  currentCurrency = 'NGN',
}) => {
  if (!product) return null;

  const currency = (currentCurrency as CurrencyCode) || 'NGN';
  const { user, userProfile } = useAuth();
  const [selectedImage, setSelectedImage] = useState(product.images[0]);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'features' | 'reviews' | 'warranty'>('specs');
  const [customAIQuestion, setCustomAIQuestion] = useState('');
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);

  // Reviews State
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [newComment, setNewComment] = useState<string>('');
  const [newTitle, setNewTitle] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');
  const [reviewErrorMsg, setReviewErrorMsg] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [votedHelpfulReviews, setVotedHelpfulReviews] = useState<string[]>([]);

  // Load Firestore reviews for current product
  useEffect(() => {
    if (product?.id) {
      setLoadingReviews(true);
      getReviewsForProductFromFirestore(product.id)
        .then((firestoreReviews) => {
          const mockRevs = INITIAL_REVIEWS.filter(r => r.productId === product.id);
          // Combine firestore reviews with mock reviews (prefer firestore)
          const combined = [...firestoreReviews, ...mockRevs.filter(m => !firestoreReviews.some(f => f.id === m.id))];
          setReviewsList(combined);
        })
        .catch(console.error)
        .finally(() => setLoadingReviews(false));
    }
  }, [product?.id]);

  // Compute live review metrics
  const totalReviewsCount = reviewsList.length > 0 ? reviewsList.length : (product.reviewCount || 0);
  const averageRating = useMemo(() => {
    if (reviewsList.length === 0) return product.rating || 5.0;
    const sum = reviewsList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    return Number((sum / reviewsList.length).toFixed(1));
  }, [reviewsList, product.rating]);

  // Rating breakdown stats
  const breakdown = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (reviewsList.length === 0) {
      counts[5] = 1;
      return { counts, total: 1 };
    }
    reviewsList.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    });
    return { counts, total: reviewsList.length };
  }, [reviewsList]);

  // Filtered and sorted reviews
  const displayedReviews = useMemo(() => {
    let filtered = [...reviewsList];
    if (ratingFilter !== null) {
      filtered = filtered.filter(r => Math.round(Number(r.rating) || 5) === ratingFilter);
    }
    filtered.sort((a, b) => {
      if (sortBy === 'highest') return (Number(b.rating) || 5) - (Number(a.rating) || 5);
      if (sortBy === 'lowest') return (Number(a.rating) || 5) - (Number(b.rating) || 5);
      // newest
      const dateA = new Date(a.createdAt || a.date).getTime();
      const dateB = new Date(b.createdAt || b.date).getTime();
      return dateB - dateA;
    });
    return filtered;
  }, [reviewsList, ratingFilter, sortBy]);

  const handleVoteHelpful = async (reviewId: string) => {
    if (votedHelpfulReviews.includes(reviewId)) return;
    setVotedHelpfulReviews(prev => [...prev, reviewId]);
    try {
      const newCount = await voteReviewHelpfulInFirestore(reviewId);
      setReviewsList(prev => prev.map(r => r.id === reviewId ? { ...r, helpfulCount: newCount || (r.helpfulCount || 0) + 1 } : r));
    } catch (err) {
      console.warn('Helpful vote error:', err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewErrorMsg('');
    setReviewSuccessMsg('');

    if (!user) {
      setReviewErrorMsg('Authentication required: You must be signed in to submit a rating and review.');
      return;
    }

    if (!newComment.trim()) {
      setReviewErrorMsg('Please enter a detailed review comment.');
      return;
    }

    setSubmittingReview(true);
    try {
      const addedReview = await addReviewToFirestore({
        productId: product.id,
        customerId: user.uid,
        userName: userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Verified Customer',
        rating: newRating,
        comment: newComment.trim(),
        title: newTitle.trim() || undefined,
      });

      const updatedList = [addedReview, ...reviewsList.filter(r => r.id !== addedReview.id)];
      setReviewsList(updatedList);
      
      const newTotal = updatedList.length;
      const sum = updatedList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
      const newAvg = Number((sum / newTotal).toFixed(1));

      // Notify parent app of new calculated average rating & review count for reactive UI updates
      if (onProductUpdated) {
        onProductUpdated({
          ...product,
          rating: addedReview.calculatedAvgRating ?? newAvg,
          reviewCount: addedReview.calculatedTotalReviews ?? newTotal
        });
      }

      setNewComment('');
      setNewTitle('');
      setNewRating(5);
      setReviewSuccessMsg('Thank you! Your verified rating and review have been saved to Firestore and updated on the product card.');
      setTimeout(() => setReviewSuccessMsg(''), 6000);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setReviewErrorMsg(err?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-left">
        
        {/* Top Header / Dismiss */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            {(product.isDigital || product.productType === 'digital_ebook') ? (
              <span className="text-xs font-black text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                DIGITAL E-BOOK — PDF
              </span>
            ) : (
              <>
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">{product.brand}</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-500">{product.capacity || 'Appliance'}</span>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body Grid */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 max-h-[80vh] overflow-y-auto">
          
          {/* Left Column: Media Gallery */}
          <div className="lg:col-span-5 space-y-4">
            {/* Main Active Image Display */}
            <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 group">
              <img
                src={selectedImage}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                onClick={() => {
                  const idx = product.images.indexOf(selectedImage);
                  setLightboxIndex(idx >= 0 ? idx : 0);
                  setShowLightbox(true);
                }}
              />

              <button
                type="button"
                onClick={() => {
                  const idx = product.images.indexOf(selectedImage);
                  setLightboxIndex(idx >= 0 ? idx : 0);
                  setShowLightbox(true);
                }}
                className="absolute bottom-3 right-3 p-2 bg-slate-950/80 hover:bg-purple-600 text-white rounded-xl border border-slate-800 backdrop-blur-md shadow-lg transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
                <span>Fullscreen Gallery ({product.images.length})</span>
              </button>

              {product.isFlashDeal && (
                <div className="absolute top-3 left-3 bg-red-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-md flex items-center gap-1 shadow-md">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Flash Deal
                </div>
              )}
            </div>

            {/* Thumbnail Row */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(img)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    selectedImage === img
                      ? 'border-cyan-500 scale-105'
                      : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="thumb" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </button>
              ))}

              {product.videoUrl && (
                <a
                  href={product.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-16 h-16 rounded-xl bg-slate-800 text-cyan-400 flex flex-col items-center justify-center text-[10px] font-bold gap-1 border border-slate-700 hover:bg-slate-700 shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Video
                </a>
              )}
            </div>

            {/* Verified Seller Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-cyan-500" />
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{product.sellerName}</span>
                </div>
                {product.sellerVerified && (
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Official Direct Manufacturer Partner • Fast Dispatch</p>
            </div>
          </div>

          {/* Right Column: Title, Price, Specifications, Actions */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                {product.title}
              </h2>

              {/* Rating & Stocks */}
              <div className="flex items-center gap-3 mt-3 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className="flex items-center text-amber-400 font-bold group cursor-pointer transition-colors"
                  title="View Customer Ratings & Reviews"
                >
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= Math.round(averageRating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-slate-900 dark:text-slate-100 group-hover:text-cyan-500 font-extrabold">{averageRating}</span>
                  <span className="text-slate-400 group-hover:text-cyan-500 font-normal ml-1">({totalReviewsCount} {totalReviewsCount === 1 ? 'review' : 'verified reviews'})</span>
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="font-semibold text-emerald-500">
                  In Stock ({product.stock} units left)
                </span>
              </div>

              {/* Digital E-book Notice Banner */}
              {(product.isDigital || product.productType === 'digital_ebook') && (
                <div className="p-4 bg-purple-950/30 border border-purple-900/50 rounded-2xl space-y-1.5 text-xs text-purple-200">
                  <div className="font-extrabold flex items-center gap-2 text-purple-300 text-sm">
                    <BookOpen className="w-4.5 h-4.5 text-purple-400" />
                    <span>Digital Product — PDF</span>
                  </div>
                  <p className="text-[11px] text-purple-200/90 leading-relaxed">
                    This is a digital product. No physical item will be shipped. Instant access to your PDF document is automatically granted in your Digital Library upon purchase.
                  </p>
                  <div className="pt-1 text-[11px] text-slate-300 flex flex-wrap items-center gap-4 border-t border-purple-900/40">
                    {product.author && <span>Author: <strong className="text-white">{product.author}</strong></span>}
                    {product.publisher && <span>Publisher: <strong className="text-slate-200">{product.publisher}</strong></span>}
                    {product.pdfFileSize && <span>Size: <strong className="text-purple-300 font-mono">{product.pdfFileSize}</strong></span>}
                  </div>
                </div>
              )}

              {/* Price Banner */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                      {formatCurrency(product.price, currency)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-slate-400 line-through font-mono">
                        {formatCurrency(product.originalPrice, currency)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Taxes included • Free installation available</p>
                </div>

                <div className="flex items-center gap-2">
                  {product.discountPercentage && (
                    <span className="bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow">
                      Save {product.discountPercentage}%
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (onSetPriceAlert) onSetPriceAlert(product);
                      else setShowPriceAlertModal(true);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm ${
                      hasPriceAlert
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30'
                    }`}
                    title="Set Target Price Alert"
                  >
                    <Bell className={`w-3.5 h-3.5 ${hasPriceAlert ? 'fill-current' : ''}`} />
                    <span>{hasPriceAlert ? 'Alert Active' : 'Price Alert'}</span>
                  </button>
                </div>
              </div>

              {/* Interactive Tabs */}
              <div className="mt-6 border-b border-slate-200 dark:border-slate-800 flex gap-4 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeTab === 'specs'
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Specifications
                </button>
                <button
                  onClick={() => setActiveTab('features')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeTab === 'features'
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Key Features
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'reviews'
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Customer Reviews</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'reviews'
                      ? 'bg-cyan-500/20 text-cyan-500'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {totalReviewsCount}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('warranty')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeTab === 'warranty'
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Warranty & Returns
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="py-4 text-xs">
                {activeTab === 'specs' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-slate-500 font-medium">{key}:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'features' && (
                  <ul className="space-y-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {product.keyFeatures.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
                        <Check className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-5">
                    {/* Average Rating & Breakdown Overview Card */}
                    <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                      {/* Left: Big Score & Stars */}
                      <div className="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left justify-center space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-4 md:pb-0 md:pr-4">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Customer Rating</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                            {averageRating}
                          </span>
                          <span className="text-sm font-bold text-slate-400">/ 5.0</span>
                        </div>

                        {/* Star visual icons */}
                        <div className="flex items-center gap-1 my-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(averageRating)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-300 dark:text-slate-700'
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-xs text-slate-500">
                          Based on <strong className="text-slate-900 dark:text-slate-200">{totalReviewsCount}</strong> verified ratings
                        </p>

                        {totalReviewsCount > 0 && (
                          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                            <ThumbsUp className="w-3 h-3" />
                            <span>
                              {Math.round((((breakdown.counts[5] || 0) + (breakdown.counts[4] || 0)) / (breakdown.total || 1)) * 100)}% Recommend this product
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: 5-Star Breakdown Progress Bars */}
                      <div className="md:col-span-7 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                          <span>Rating Distribution</span>
                          {ratingFilter !== null && (
                            <button
                              onClick={() => setRatingFilter(null)}
                              className="text-cyan-500 hover:underline cursor-pointer"
                            >
                              Reset Filter
                            </button>
                          )}
                        </div>

                        {([5, 4, 3, 2, 1] as const).map((star) => {
                          const count = breakdown.counts[star] || 0;
                          const pct = breakdown.total > 0 ? Math.round((count / breakdown.total) * 100) : 0;
                          const isSelected = ratingFilter === star;

                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatingFilter(isSelected ? null : star)}
                              className={`w-full flex items-center gap-2 text-xs py-1 px-2 rounded-lg transition-colors group cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-500/10 border border-cyan-500/30'
                                  : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <span className="w-10 font-bold text-left text-slate-700 dark:text-slate-300 group-hover:text-cyan-500 flex items-center gap-0.5">
                                {star} <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline" />
                              </span>
                              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isSelected
                                      ? 'bg-cyan-500'
                                      : star >= 4
                                      ? 'bg-amber-400'
                                      : star === 3
                                      ? 'bg-amber-500'
                                      : 'bg-rose-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-8 text-right font-mono text-[11px] text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Authenticated User Submit Review Box */}
                    <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-cyan-500" />
                          <span>Leave a Product Rating & Review</span>
                        </h4>
                        {user ? (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            <UserCheck className="w-3 h-3" /> Signed in as {userProfile?.displayName || user.displayName || user.email?.split('@')[0]}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            <Lock className="w-3 h-3" /> Authentication Required
                          </span>
                        )}
                      </div>

                      {reviewSuccessMsg && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{reviewSuccessMsg}</span>
                        </div>
                      )}

                      {reviewErrorMsg && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold">
                          {reviewErrorMsg}
                        </div>
                      )}

                      {user ? (
                        <form onSubmit={handleSubmitReview} className="space-y-3">
                          {/* Star Rating Picker */}
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-bold">Select Your Rating:</span>
                              <span className="text-amber-400 font-extrabold text-xs">
                                {RATING_LABELS[hoverRating || newRating]}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 pt-1">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const isFilled = star <= (hoverRating || newRating);
                                return (
                                  <button
                                    type="button"
                                    key={star}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(null)}
                                    onClick={() => setNewRating(star)}
                                    className="p-1 hover:scale-125 transition-transform focus:outline-none cursor-pointer"
                                    title={`Rate ${star} out of 5 stars`}
                                  >
                                    <Star
                                      className={`w-6 h-6 transition-colors ${
                                        isFilled
                                          ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                                          : 'text-slate-300 dark:text-slate-700'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Headline Input */}
                          <input
                            type="text"
                            placeholder="Review Headline (e.g., 'Outstanding performance & quiet operation')"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            maxLength={100}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
                          />

                          {/* Review Comment Textarea */}
                          <div className="relative">
                            <textarea
                              rows={3}
                              placeholder="Write your honest review and experience with this appliance (features, installation, performance, build quality)..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              maxLength={600}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 resize-none"
                            />
                            <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-400 font-mono">
                              {newComment.length}/600
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-400">
                              Reviews are verified and posted immediately to the product catalog.
                            </span>
                            <button
                              type="submit"
                              disabled={submittingReview}
                              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                            >
                              {submittingReview ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Submitting to Firestore...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Post Product Review</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                              <UserCheck className="w-4 h-4" />
                              <span>Sign in to share your verified review</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              You must be logged into your NEXOVIRA account to rate products and submit customer reviews.
                            </p>
                          </div>
                          {onSignInRequested && (
                            <button
                              type="button"
                              onClick={onSignInRequested}
                              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs rounded-xl shadow hover:brightness-110 transition-all shrink-0 cursor-pointer text-center"
                            >
                              Sign In to Review
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Filter and Sort Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5 text-cyan-500" />
                          <span>All Reviews ({displayedReviews.length})</span>
                        </span>
                        {ratingFilter !== null && (
                          <span className="text-[10px] bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                            Showing {ratingFilter} Star only
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                          <ArrowUpDown className="w-3 h-3" /> Sort:
                        </span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="newest">Most Recent</option>
                          <option value="highest">Highest Rated (5★)</option>
                          <option value="lowest">Lowest Rated (1★)</option>
                        </select>
                      </div>
                    </div>

                    {/* Existing Reviews List */}
                    <div className="space-y-3">
                      {loadingReviews ? (
                        <div className="p-6 text-center text-slate-500 italic text-xs space-y-2">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-500" />
                          <p>Loading customer reviews from Firestore...</p>
                        </div>
                      ) : displayedReviews.length > 0 ? (
                        displayedReviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-black text-xs flex items-center justify-center">
                                  {rev.userName ? rev.userName.slice(0, 2).toUpperCase() : 'CU'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-900 dark:text-white text-xs">{rev.userName}</span>
                                    {rev.verifiedPurchase && (
                                      <span className="text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                                        <ShieldCheck className="w-2.5 h-2.5" /> Verified Buyer
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400">{rev.date || 'Recent review'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${
                                      s <= Number(rev.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'
                                    }`}
                                  />
                                ))}
                                <span className="text-xs font-bold text-amber-500 ml-1">{Number(rev.rating).toFixed(1)}</span>
                              </div>
                            </div>

                            {rev.title && (
                              <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 pt-0.5">
                                {rev.title}
                              </h5>
                            )}

                            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                              {rev.comment}
                            </p>

                            <div className="pt-2 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/50 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" /> Authenticated Verified Customer
                              </span>

                              <button
                                type="button"
                                onClick={() => handleVoteHelpful(rev.id)}
                                disabled={votedHelpfulReviews.includes(rev.id)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                  votedHelpfulReviews.includes(rev.id)
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                    : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <ThumbsUp className={`w-3 h-3 ${votedHelpfulReviews.includes(rev.id) ? 'fill-current' : ''}`} />
                                <span>Helpful ({rev.helpfulCount || 0})</span>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                          <MessageSquare className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                          <p className="text-slate-500 text-xs font-medium">
                            {ratingFilter !== null
                              ? `No ${ratingFilter}-star reviews found.`
                              : 'No customer reviews yet. Be the first to review this product!'}
                          </p>
                          {ratingFilter !== null && (
                            <button
                              onClick={() => setRatingFilter(null)}
                              className="text-xs text-cyan-500 font-bold hover:underline"
                            >
                              Show all reviews
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'warranty' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <Award className="w-4 h-4 text-cyan-500" />
                      <span>{product.warranty}</span>
                    </div>
                    <p className="text-slate-500">
                      Includes 30-day NEXOVIRA Money Back Buyer Protection. In case of defects, direct replacement is provided within 7 business days.
                    </p>
                  </div>
                )}
              </div>

              {/* Inline Ask AI Form */}
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-500">
                  <Sparkles className="w-4 h-4" />
                  <span>Ask NEXOVIRA AI about this product</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`e.g. "Will this ${product.brand} fit in a standard cabinet?"`}
                    value={customAIQuestion}
                    onChange={(e) => setCustomAIQuestion(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (customAIQuestion) {
                        onAskAI(`About ${product.title}: ${customAIQuestion}`);
                        onClose();
                      }
                    }}
                    className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-cyan-400"
                  >
                    Ask
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              {/* Quantity Selector */}
              <div className="flex items-center border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300 hover:text-cyan-500"
                >
                  -
                </button>
                <span className="px-3 text-sm font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300 hover:text-cyan-500"
                >
                  +
                </button>
              </div>

              {/* Add to Cart */}
              <button
                onClick={() => {
                  onAddToCart(product, quantity);
                  onClose();
                }}
                className="flex-1 w-full sm:w-auto py-3 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-sm rounded-xl hover:bg-cyan-600 dark:hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add To Cart ({formatCurrency(product.price * quantity, currency)})</span>
              </button>

              {/* Compare Button */}
              <button
                onClick={() => onCompare(product)}
                className="w-full sm:w-auto py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Compare
              </button>

              {/* Share / Generate Affiliate Link Button */}
              <button
                onClick={() => setShowAffiliateModal(true)}
                className="w-full sm:w-auto py-3 px-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-500/20"
                title="Generate Trackable Affiliate Deep Link"
              >
                <Share2 className="w-4 h-4" />
                <span>Affiliate Link</span>
              </button>

              {/* Wishlist Heart Button */}
              {onToggleWishlist && (
                <button
                  onClick={() => onToggleWishlist(product)}
                  className={`w-full sm:w-auto py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    isInWishlist
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20'
                  }`}
                  title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-current' : ''}`} />
                  <span>{isInWishlist ? 'In Wishlist' : 'Wishlist'}</span>
                </button>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Affiliate Link Generator Modal */}
      {showAffiliateModal && (
        <AffiliateLinkModal
          isOpen={showAffiliateModal}
          onClose={() => setShowAffiliateModal(false)}
          affiliateUid={user?.uid || 'guest'}
          affiliateCode={userProfile?.affiliateCode || 'NEXO-AFF'}
          item={{
            id: product.id,
            title: product.title,
            contentType: product.isDigital || product.productType === 'digital_ebook' ? 'EBOOK' : 'PRODUCT',
            targetPath: `/product/${product.id}`,
            commissionRate: product.affiliateCommissionRate || 10,
            price: product.price
          }}
        />
      )}

      {/* Fullscreen Responsive Image Lightbox Modal */}
      <EbookLightboxModal
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        images={product.images || []}
        currentIndex={lightboxIndex}
        onNavigate={(idx) => {
          setLightboxIndex(idx);
          if (product.images && product.images[idx]) {
            setSelectedImage(product.images[idx]);
          }
        }}
        title={product.isDigital || product.productType === 'digital_ebook' ? 'E-Book Previews & Cover' : 'Product Gallery'}
      />

      {/* Target Price Alert Setup Modal */}
      {showPriceAlertModal && (
        <SetPriceAlertModal
          isOpen={showPriceAlertModal}
          onClose={() => setShowPriceAlertModal(false)}
          product={product}
          currentCurrency={currency}
        />
      )}
    </div>
  );
};
