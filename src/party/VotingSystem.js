/**
 * VotingSystem — Hệ thống bỏ phiếu trực tiếp (Phục vụ lá bài DR-11 Bốc Phốt Lên Nhóm Chat Chung)
 * Tất cả người chơi khác giơ tay hoặc bấm nút bỏ phiếu trong 3 giây
 */

export class VotingSystem {
  static createVoteSession({
    initiatorPlayerId,
    targetPlayerId,
    livingPlayerIds = [],
    durationSeconds = 3
  }) {
    // Người bị phốt không được tham gia bỏ phiếu
    const eligibleVoters = livingPlayerIds.filter(id => id !== targetPlayerId);
    const votes = new Map(); // voterId -> 'YES' | 'NO'

    return {
      initiatorPlayerId,
      targetPlayerId,
      durationSeconds,
      eligibleVoters,
      votes,
      isClosed: false,
      startedAt: Date.now()
    };
  }

  static castVote(session, voterId, vote) {
    if (session.isClosed) return false;
    if (!session.eligibleVoters.includes(voterId)) return false;
    if (vote !== 'YES' && vote !== 'NO') return false;

    session.votes.set(voterId, vote);
    return true;
  }

  static tallyVotes(session) {
    session.isClosed = true;
    let yesCount = 0;
    let noCount = 0;

    for (const v of session.votes.values()) {
      if (v === 'YES') yesCount++;
      if (v === 'NO') noCount++;
    }

    // Đa số tán thành (yesCount > noCount)
    const passed = yesCount > noCount;

    return {
      passed,
      yesCount,
      noCount,
      totalVotes: session.votes.size,
      eligibleVotersCount: session.eligibleVoters.length
    };
  }
}
