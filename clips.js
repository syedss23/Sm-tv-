// Clips Manager - Adapted for your JSON structure
class ClipsManager {
    constructor() {
        this.clipsContainer = document.getElementById('clipsContainer');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.errorMessage = document.getElementById('errorMessage');
        this.clips = [];
        this.currentClipIndex = 0;
        this.observer = null;
        this.isScrolling = false;
        this.scrollTimeout = null;
        
        this.init();
    }

    async init() {
        try {
            await this.loadClips();
            this.loadLikeStates();
            this.renderClips();
            this.setupScrollBehavior();
            this.hideLoading();
        } catch (error) {
            console.error('Error initializing clips:', error);
            this.showError();
        }
    }

    async loadClips() {
        try {
            const response = await fetch('clips.json');
            if (!response.ok) throw new Error('Failed to load clips');
            this.clips = await response.json();
            
            // Add default properties if not present
            this.clips = this.clips.map(clip => ({
                ...clip,
                likes: clip.likes || 0,
                comments: clip.comments || 0,
                shares: clip.shares || 0,
                isLiked: false,
                series: this.extractSeriesName(clip.title)
            }));
        } catch (error) {
            throw error;
        }
    }

    extractSeriesName(title) {
        // Extract series name from title
        if (title.includes('Alp Arslan')) return 'Alp Arslan';
        if (title.includes('Murad')) return 'Sultan Murad';
        if (title.includes('Orhan')) return 'Kurulus Orhan';
        if (title.includes('Mehmet') || title.includes('Fatih')) return 'Sultan Mehmet Fatih';
        if (title.includes('Salahuddin') || title.includes('Ayyubi')) return 'Salahuddin Ayyubi';
        if (title.includes('Rumi')) return 'Rumi';
        return 'Turkish Drama';
    }

    generateHashtags(title, series) {
        const hashtags = [];
        const words = title.split(' ');
        
        // Add series hashtag
        hashtags.push('#' + series.replace(/s+/g, ''));
        
        // Add common hashtags
        hashtags.push('#TurkishDrama');
        
        // Add specific hashtags based on content
        if (title.toLowerCase().includes('battle')) hashtags.push('#EpicBattle');
        if (title.toLowerCase().includes('sultan')) hashtags.push('#Ottoman');
        
        return hashtags;
    }

    renderClips() {
        if (!this.clips || this.clips.length === 0) {
            this.showError();
            return;
        }

        this.clipsContainer.innerHTML = this.clips.map((clip, index) => `
            <div class="clip-item" data-clip-index="${index}" data-clip-id="${clip.id}">
                <div class="video-wrapper">
                    <iframe 
                        src="${clip.embed}" 
                        frameborder="0" 
                        allowfullscreen
                        allow="autoplay; fullscreen; accelerometer; gyroscope; picture-in-picture"
                        loading="${index === 0 ? 'eager' : 'lazy'}">
                    </iframe>
                </div>
                <div class="clip-info">
                    <div class="clip-series">${clip.series}</div>
                    <div class="clip-title">${clip.title}</div>
                    <div class="clip-description">${clip.desc}</div>
                    <div class="clip-hashtags">${this.generateHashtags(clip.title, clip.series).join(' ')}</div>
                </div>
                <div class="action-buttons">
                    <div>
                        <button class="action-btn like-btn" data-clip-id="${clip.id}" aria-label="Like">
                            ${clip.isLiked ? '❤️' : '🤍'}
                        </button>
                        <div class="action-count">${this.formatCount(clip.likes)}</div>
                    </div>
                    <div>
                        <button class="action-btn comment-btn" data-clip-id="${clip.id}" aria-label="Comment">
                            💬
                        </button>
                        <div class="action-count">${this.formatCount(clip.comments)}</div>
                    </div>
                    <div>
                        <button class="action-btn share-btn" data-clip-id="${clip.id}" aria-label="Share">
                            ↗️
                        </button>
                        <div class="action-count">${this.formatCount(clip.shares)}</div>
                    </div>
                    <div>
                        <button class="action-btn download-btn" data-clip-id="${clip.id}" aria-label="Download">
                            ⬇️
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        this.setupActionButtons();
    }

    setupActionButtons() {
        // Like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clipId = e.currentTarget.dataset.clipId;
                this.handleLike(clipId, e.currentTarget);
            });
        });

        // Comment buttons
        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clipId = e.currentTarget.dataset.clipId;
                this.handleComment(clipId);
            });
        });

        // Share buttons
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clipId = e.currentTarget.dataset.clipId;
                this.handleShare(clipId);
            });
        });

        // Download buttons
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clipId = e.currentTarget.dataset.clipId;
                this.handleDownload(clipId);
            });
        });
    }

    setupScrollBehavior() {
        const clipItems = document.querySelectorAll('.clip-item');
        
        // Intersection Observer to track current clip
        const observerOptions = {
            root: this.clipsContainer,
            threshold: 0.6
        };

        this.observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.currentClipIndex = parseInt(entry.target.dataset.clipIndex);
                    
                    // Pause other videos when scrolling (optional)
                    this.pauseOtherVideos(entry.target);
                }
            });
        }, observerOptions);

        clipItems.forEach(clip => this.observer.observe(clip));

        // Smooth snap after scrolling stops
        this.clipsContainer.addEventListener('scroll', () => {
            if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
            this.isScrolling = true;

            this.scrollTimeout = setTimeout(() => {
                this.isScrolling = false;
                const currentClip = clipItems[this.currentClipIndex];
                if (currentClip) {
                    currentClip.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }, 150);
        });

        // Prevent fast scroll skipping on desktop with mouse wheel
        this.clipsContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = Math.sign(e.deltaY);
            
            if (!this.isScrolling) {
                const nextIndex = this.currentClipIndex + delta;
                
                if (nextIndex >= 0 && nextIndex < clipItems.length) {
                    clipItems[nextIndex].scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }
        }, { passive: false });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const direction = e.key === 'ArrowDown' ? 1 : -1;
                const nextIndex = this.currentClipIndex + direction;
                
                if (nextIndex >= 0 && nextIndex < clipItems.length) {
                    clipItems[nextIndex].scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }
        });
    }

    pauseOtherVideos(currentClipElement) {
        // Optional: Pause videos that are not visible
        const allIframes = document.querySelectorAll('.clip-item iframe');
        allIframes.forEach(iframe => {
            if (iframe.closest('.clip-item') !== currentClipElement) {
                // Note: Rumble embeds auto-pause when out of view
            }
        });
    }

    handleLike(clipId, button) {
        const clip = this.clips.find(c => c.id === clipId);
        if (!clip) return;

        clip.isLiked = !clip.isLiked;
        clip.likes = (clip.likes || 0) + (clip.isLiked ? 1 : -1);

        button.textContent = clip.isLiked ? '❤️' : '🤍';
        button.classList.toggle('liked', clip.isLiked);
        
        const countElement = button.parentElement.querySelector('.action-count');
        if (countElement) {
            countElement.textContent = this.formatCount(clip.likes);
        }

        // Animate button
        button.style.transform = 'scale(1.2)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);

        // Save to localStorage
        this.saveLikeState(clipId, clip.isLiked, clip.likes);
    }

    handleComment(clipId) {
        const clip = this.clips.find(c => c.id === clipId);
        console.log('Comment on:', clip.title);
        
        // Increment comment count
        clip.comments = (clip.comments || 0) + 1;
        
        // Update UI
        const clipElement = document.querySelector(`[data-clip-id="${clipId}"]`);
        const commentCount = clipElement.querySelector('.comment-btn').parentElement.querySelector('.action-count');
        if (commentCount) {
            commentCount.textContent = this.formatCount(clip.comments);
        }
        
        // You can implement a comment modal here
        alert('Comments feature coming soon! 💬');
    }

    handleShare(clipId) {
        const clip = this.clips.find(c => c.id === clipId);
        
        // Increment share count
        clip.shares = (clip.shares || 0) + 1;
        
        // Update UI
        const clipElement = document.querySelector(`[data-clip-id="${clipId}"]`);
        const shareCount = clipElement.querySelector('.share-btn').parentElement.querySelector('.action-count');
        if (shareCount) {
            shareCount.textContent = this.formatCount(clip.shares);
        }
        
        const shareData = {
            title: clip.title,
            text: clip.desc,
            url: `${window.location.origin}/clips?id=${clipId}`
        };

        if (navigator.share) {
            navigator.share(shareData)
                .then(() => console.log('Shared successfully'))
                .catch(err => console.log('Share cancelled', err));
        } else {
            // Fallback: Copy to clipboard
            const shareUrl = shareData.url;
            navigator.clipboard.writeText(shareUrl)
                .then(() => {
                    alert('📋 Link copied to clipboard!');
                })
                .catch(() => {
                    prompt('Copy this link:', shareUrl);
                });
        }
    }

    handleDownload(clipId) {
        const clip = this.clips.find(c => c.id === clipId);
        
        // Extract video URL from embed
        const videoUrl = clip.embed.replace('/embed/', '/');
        
        // Open in new tab (user can download from Rumble)
        window.open(videoUrl, '_blank');
    }

    formatCount(count) {
        if (!count || count === 0) return '0';
        
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        } else if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        return count.toString();
    }

    saveLikeState(clipId, isLiked, likeCount) {
        const likes = JSON.parse(localStorage.getItem('clipLikes') || '{}');
        likes[clipId] = { isLiked, likeCount, timestamp: Date.now() };
        localStorage.setItem('clipLikes', JSON.stringify(likes));
    }

    loadLikeStates() {
        const likes = JSON.parse(localStorage.getItem('clipLikes') || '{}');
        this.clips.forEach(clip => {
            if (likes[clip.id]) {
                clip.isLiked = likes[clip.id].isLiked;
                clip.likes = likes[clip.id].likeCount || 0;
            }
        });
    }

    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
        }
    }

    showError() {
        this.hideLoading();
        if (this.errorMessage) {
            this.errorMessage.style.display = 'block';
            setTimeout(() => {
                this.errorMessage.style.display = 'none';
            }, 3000);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ClipsManager();
});

// Prevent pull-to-refresh on mobile
document.body.addEventListener('touchmove', (e) => {
    if (e.target.closest('.clips-container')) {
        // Allow scrolling within clips container
    }
}, { passive: true });
