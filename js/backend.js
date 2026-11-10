window.SkillexBackend = (() => {
  const config = window.SKILLEX_SUPABASE_CONFIG;
  const client = config && window.supabase?.createClient
    ? window.supabase.createClient(config.url, config.publishableKey)
    : null;

  function getClient() {
    if (!client) {
      throw new Error("Skillex backend is not configured. Check the Supabase public configuration.");
    }
    return client;
  }

  function throwIfError(result) {
    if (result.error) throw result.error;
    return result.data;
  }

  function normalizeGoalNames(value) {
    return String(value || "")
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function findSkillId(value, catalog) {
    const normalized = value.toLowerCase();
    return catalog.find((skill) => skill.id.toLowerCase() === normalized || skill.title.toLowerCase() === normalized)?.id;
  }

  async function saveProfileSkills(userId, learnGoals, teachGoals, catalog) {
    const db = getClient();
    for (const [intent, value] of [["learn", learnGoals], ["teach", teachGoals]]) {
      const desiredIds = [...new Set(normalizeGoalNames(value).map((name) => findSkillId(name, catalog)).filter(Boolean))];
      const current = throwIfError(await db.from("profile_skills").select("skill_id").eq("user_id", userId).eq("intent", intent));
      const currentIds = current.map((entry) => entry.skill_id);
      const removeIds = currentIds.filter((id) => !desiredIds.includes(id));
      const addIds = desiredIds.filter((id) => !currentIds.includes(id));

      if (removeIds.length) {
        throwIfError(await db.from("profile_skills").delete().eq("user_id", userId).eq("intent", intent).in("skill_id", removeIds));
      }
      if (addIds.length) {
        throwIfError(await db.from("profile_skills").insert(addIds.map((skillId) => ({
          user_id: userId,
          skill_id: skillId,
          intent
        }))));
      }
    }
  }

  async function signUp({ name, email, password, bio, learnGoals, teachGoals, role }) {
    const db = getClient();
    return throwIfError(await db.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          bio,
          learn_goals: learnGoals,
          teach_goals: teachGoals,
          role
        },
        emailRedirectTo: "https://skillex-hydev.netlify.app"
      }
    }));
  }

  async function signIn(email, password) {
    return throwIfError(await getClient().auth.signInWithPassword({ email, password }));
  }

  async function signOut() {
    return throwIfError(await getClient().auth.signOut());
  }

  async function getSession() {
    const result = throwIfError(await getClient().auth.getSession());
    return result.session;
  }

  async function loadProfile(user, catalog) {
    const db = getClient();
    const profile = throwIfError(await db.from("profiles")
      .select("id,display_name,bio,avatar_path,created_at")
      .eq("id", user.id)
      .single());
    let profileSkills = throwIfError(await db.from("profile_skills")
      .select("skill_id,intent")
      .eq("user_id", user.id));
    const skillTitles = new Map(catalog.map((skill) => [skill.id, skill.title]));
    const metadata = user.user_metadata || {};
    const learnGoals = profileSkills.filter((entry) => entry.intent === "learn")
      .map((entry) => skillTitles.get(entry.skill_id)).filter(Boolean);
    const teachGoals = profileSkills.filter((entry) => entry.intent === "teach")
      .map((entry) => skillTitles.get(entry.skill_id)).filter(Boolean);

    if (!profileSkills.length && (metadata.learn_goals || metadata.teach_goals)) {
      await saveProfileSkills(user.id, metadata.learn_goals, metadata.teach_goals, catalog);
      profileSkills = throwIfError(await db.from("profile_skills")
        .select("skill_id,intent")
        .eq("user_id", user.id));
      learnGoals.push(...normalizeGoalNames(metadata.learn_goals).filter((name) => !learnGoals.includes(name)));
      teachGoals.push(...normalizeGoalNames(metadata.teach_goals).filter((name) => !teachGoals.includes(name)));
    }

    return {
      id: user.id,
      name: profile.display_name || metadata.display_name || user.email?.split("@")[0] || "Learner",
      email: user.email || "",
      bio: profile.bio || metadata.bio || "",
      role: metadata.role || (teachGoals.length ? "Both" : "Learner"),
      learnGoals: learnGoals.join(", "),
      teachGoals: teachGoals.join(", "),
      joinedAt: profile.created_at,
      avatarPath: profile.avatar_path
    };
  }

  async function updateProfile(user, values, catalog) {
    const db = getClient();
    const changes = {
      data: {
        display_name: values.name,
        bio: values.bio,
        learn_goals: values.learnGoals,
        teach_goals: values.teachGoals
      }
    };
    const emailChangePending = values.email !== user.email;
    if (emailChangePending) changes.email = values.email;
    const authUser = throwIfError(await db.auth.updateUser(changes));
    throwIfError(await db.from("profiles").update({
      display_name: values.name,
      bio: values.bio
    }).eq("id", user.id));
    await saveProfileSkills(user.id, values.learnGoals, values.teachGoals, catalog);
    const profile = await loadProfile({
      ...user,
      email: authUser.user.email,
      user_metadata: authUser.user.user_metadata
    }, catalog);
    return { profile, emailChangePending };
  }

  async function loadCourses() {
    return throwIfError(await getClient().from("skills")
      .select("id,title,category,description,course_content")
      .order("title"));
  }

  async function loadProfileSkills(userId) {
    return throwIfError(await getClient().from("profile_skills")
      .select("user_id,skill_id,intent,proficiency,notes")
      .eq("user_id", userId));
  }

  async function loadUserData(userId, catalog) {
    const db = getClient();
    const [saved, progress, savedLessons, requests] = await Promise.all([
      db.from("saved_skills").select("skill_id").eq("user_id", userId),
      db.from("learning_progress").select("skill_id,completed_lessons,active_lesson,notes,quiz_scores,time_spent_seconds,updated_at").eq("user_id", userId),
      db.from("saved_lessons").select("skill_id,lesson_title").eq("user_id", userId),
      db.from("swap_requests")
        .select("id,requester_id,receiver_id,learn_skill_id,teach_skill_id,message,status,created_at")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
    ]);
    const requestRows = throwIfError(requests);
    const peerIds = [...new Set(requestRows.map((request) =>
      request.requester_id === userId ? request.receiver_id : request.requester_id
    ))];
    const peers = peerIds.length
      ? throwIfError(await db.from("profiles").select("id,display_name").in("id", peerIds))
      : [];
    const peerNames = new Map(peers.map((peer) => [peer.id, peer.display_name]));
    const skillTitles = new Map(catalog.map((skill) => [skill.id, skill.title]));

    return {
      saved: throwIfError(saved).map((entry) => entry.skill_id),
      progress: throwIfError(progress).reduce((map, entry) => {
        map[entry.skill_id] = {
          completedLessons: entry.completed_lessons,
          activeLesson: entry.active_lesson || "",
          notes: entry.notes,
          quizScores: entry.quiz_scores,
          timeSpentSeconds: entry.time_spent_seconds,
          lastUpdated: Date.parse(entry.updated_at)
        };
        return map;
      }, {}),
      savedLessons: throwIfError(savedLessons)
        .map((entry) => `${entry.skill_id}::${entry.lesson_title}`),
      requests: requestRows.map((request) => {
        const peerId = request.requester_id === userId ? request.receiver_id : request.requester_id;
        return {
          id: request.id,
          requesterId: request.requester_id,
          receiverId: request.receiver_id,
          peerId,
          peerName: peerNames.get(peerId) || "Skillex learner",
          learnSkill: skillTitles.get(request.learn_skill_id) || request.learn_skill_id,
          teachSkill: skillTitles.get(request.teach_skill_id) || request.teach_skill_id,
          learnSkillId: request.learn_skill_id,
          teachSkillId: request.teach_skill_id,
          message: request.message,
          status: request.status,
          createdAt: request.created_at
        };
      })
    };
  }

  async function saveProgress(userId, skillId, progress) {
    const db = getClient();
    return throwIfError(await db.from("learning_progress").upsert({
      user_id: userId,
      skill_id: skillId,
      completed_lessons: progress.completedLessons || [],
      active_lesson: progress.activeLesson || null,
      notes: progress.notes || "",
      quiz_scores: progress.quizScores || {},
      time_spent_seconds: progress.timeSpentSeconds || 0
    }, { onConflict: "user_id,skill_id" }));
  }

  async function replaceSavedSkills(userId, skillIds) {
    const db = getClient();
    const current = throwIfError(await db.from("saved_skills").select("skill_id").eq("user_id", userId));
    const currentIds = current.map((entry) => entry.skill_id);
    const removeIds = currentIds.filter((id) => !skillIds.includes(id));
    const addIds = skillIds.filter((id) => !currentIds.includes(id));
    if (removeIds.length) {
      throwIfError(await db.from("saved_skills").delete().eq("user_id", userId).in("skill_id", removeIds));
    }
    if (addIds.length) {
      throwIfError(await db.from("saved_skills").insert(addIds.map((skillId) => ({ user_id: userId, skill_id: skillId }))));
    }
  }

  async function replaceSavedLessons(userId, lessonKeys) {
    const db = getClient();
    const current = throwIfError(await db.from("saved_lessons").select("skill_id,lesson_title").eq("user_id", userId));
    const currentKeys = current.map((entry) => `${entry.skill_id}::${entry.lesson_title}`);
    const remove = current.filter((entry) => !lessonKeys.includes(`${entry.skill_id}::${entry.lesson_title}`));
    const add = lessonKeys.filter((key) => !currentKeys.includes(key)).map((key) => {
      const separator = key.indexOf("::");
      return { user_id: userId, skill_id: key.slice(0, separator), lesson_title: key.slice(separator + 2) };
    });
    for (const entry of remove) {
      throwIfError(await db.from("saved_lessons").delete()
        .eq("user_id", userId)
        .eq("skill_id", entry.skill_id)
        .eq("lesson_title", entry.lesson_title));
    }
    if (add.length) throwIfError(await db.from("saved_lessons").insert(add));
  }

  async function loadMatches(userId) {
    const db = getClient();
    const entries = throwIfError(await db.from("profile_skills")
      .select("user_id,skill_id,intent")
      .neq("user_id", userId));
    const peerIds = [...new Set(entries.map((entry) => entry.user_id))];
    if (!peerIds.length) return [];
    const profiles = throwIfError(await db.from("profiles")
      .select("id,display_name,bio")
      .in("id", peerIds));
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    return entries.map((entry) => ({
      ...entry,
      name: profileMap.get(entry.user_id)?.display_name || "Skillex learner",
      bio: profileMap.get(entry.user_id)?.bio || ""
    }));
  }

  async function createSwapRequest(request) {
    return throwIfError(await getClient().from("swap_requests").insert({
      requester_id: request.requesterId,
      receiver_id: request.receiverId,
      learn_skill_id: request.learnSkillId,
      teach_skill_id: request.teachSkillId,
      message: request.message || "",
      status: "requested"
    }).select("id").single());
  }

  async function updateSwapStatus(id, status) {
    return throwIfError(await getClient().from("swap_requests")
      .update({ status })
      .eq("id", id)
      .select("id")
      .single());
  }

  async function uploadAvatar(userId, file, oldPath) {
    const db = getClient();
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    throwIfError(await db.storage.from("avatars").upload(path, file, {
      contentType: file.type,
      upsert: false
    }));
    throwIfError(await db.from("profiles").update({ avatar_path: path }).eq("id", userId));
    if (oldPath) throwIfError(await db.storage.from("avatars").remove([oldPath]));
    return path;
  }

  async function getAvatarUrl(path) {
    if (!path) return "";
    const result = throwIfError(await getClient().storage.from("avatars").createSignedUrl(path, 3600));
    return result.signedUrl;
  }

  return {
    isConfigured: Boolean(client),
    signUp,
    signIn,
    signOut,
    getSession,
    loadProfile,
    updateProfile,
    loadCourses,
    loadProfileSkills,
    loadUserData,
    saveProgress,
    replaceSavedSkills,
    replaceSavedLessons,
    loadMatches,
    createSwapRequest,
    updateSwapStatus,
    uploadAvatar,
    getAvatarUrl
  };
})();
