/* ==========================================================================
   ParityCheck.cs — офлайн-проверка логики Unity-версии (tools/unity-check).

   Компилирует настоящие файлы Assets/Scripts/Core поверх заглушек UnityEngine
   и прогоняет по ним те же проверки, что браузерный smoke-test, плюс сверку
   сгенерированных контрактов и боссов с браузерной версией поле в поле.

   Запуск:
       cd tools/web && node dump-parity.mjs > /tmp/web-contracts.json
       cd tools/unity-check/parity && dotnet run -- /tmp/web-contracts.json
   ========================================================================== */
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text.Json;
using CryptoHack;

class Program
{
    static int passed;
    static int failed;

    static void Check(string name, bool ok, string detail = "")
    {
        if (ok) passed++;
        else failed++;
        Console.WriteLine((ok ? "✓ " : "✗ ") + name + (string.IsNullOrEmpty(detail) ? "" : " — " + detail));
    }

    static string FindRepoRoot()
    {
        DirectoryInfo dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "Assets", "Resources"))) return dir.FullName;
            dir = dir.Parent;
        }
        // запуск из каталога tools/unity
        dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir != null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "Assets", "Resources"))) return dir.FullName;
            dir = dir.Parent;
        }
        Console.WriteLine("не найден корень репозитория (Assets/Resources)");
        Environment.Exit(2);
        return "";
    }

    static Game NewGame()
    {
        Game game = new Game();
        game.Init();
        return game;
    }

    static int Main(string[] args)
    {
        string repo = FindRepoRoot();
        UnityEngine.Resources.DataRoot = Path.Combine(repo, "Assets", "Resources");
        string savePath = Path.Combine(Path.GetTempPath(), "cryptohack-harness", Game.SaveFileName);
        UnityEngine.Application.persistentDataPath = Path.GetDirectoryName(savePath);
        Directory.CreateDirectory(UnityEngine.Application.persistentDataPath);
        if (File.Exists(savePath)) File.Delete(savePath);

        Console.WriteLine("=== Unity-ядро: контент ===");
        Game game = NewGame();
        Check("данные загружены", game.Data.Cryptos.Count == 4 && game.Data.Missions.Count > 0,
            "монет " + game.Data.Cryptos.Count + ", миссий " + game.Data.Missions.Count);
        Check("обучение — это миссия 1 из gamedata.json",
            game.Tutorial.Id == 1 && game.Tutorial.Tutorial && game.Tutorial.Title.StartsWith("ОБУЧЕНИЕ"),
            game.Tutorial.Title);

        TemplateInfo[] templates = ContractGenerator.AllTemplates();
        Check("шаблонов заданий 23", templates.Length == 23, templates.Length + " шт.");

        List<string> bad = new List<string>();
        foreach (TemplateInfo tpl in templates)
        {
            string tierKey = ContractGenerator.Tiers[tpl.Tiers[0]].Key;
            for (int seed = 1; seed <= 4; seed++)
            {
                Mission m = ContractGenerator.Generate(seed, tierKey, seed * 31337, seed, 3, tpl.Id);
                if (m.RequiredPatterns.Length == 0) bad.Add(tpl.Id + ": нет требований");
                if (string.IsNullOrEmpty(m.StarterCode)) bad.Add(tpl.Id + ": нет стартового кода");
                if (string.IsNullOrEmpty(m.Task)) bad.Add(tpl.Id + ": нет задания");
                if (m.Hints.Length < 3) bad.Add(tpl.Id + ": мало подсказок");
                if (m.Theory.Length < 3) bad.Add(tpl.Id + ": мало теории");
                if (string.IsNullOrEmpty(m.Solution) || !PySim.Simulate(m.Solution, m, 0).Success)
                    bad.Add(tpl.Id + ": решение не проходит проверку");
                if (m.Task.Contains("undefined") || m.Solution.Contains("undefined"))
                    bad.Add(tpl.Id + ": undefined в тексте");
            }
        }
        Check("все шаблоны заполнены и их решения проходят проверку", bad.Count == 0,
            bad.Count == 0 ? "по 4 seed на шаблон" : string.Join(" | ", bad.GetRange(0, Math.Min(3, bad.Count))));

        Console.WriteLine();
        Console.WriteLine("=== Unity-ядро: боссы ===");
        Check("боссов четыре", BossCatalog.Count == 4);
        int[] need = new int[BossCatalog.Count];
        for (int i = 0; i < BossCatalog.Count; i++) need[i] = BossCatalog.List[i].Need;
        bool chain = true;
        for (int i = 1; i < need.Length; i++) if (need[i] <= need[i - 1]) chain = false;
        Check("боссы идут по цепочке требований", chain, string.Join(" < ", need));

        List<string> bossBad = new List<string>();
        for (int i = 0; i < BossCatalog.Count; i++)
        {
            BossData boss = BossCatalog.List[i];
            Mission m = BossCatalog.Build(boss.Index, boss.Id * 7919);
            if (m == null || !m.Boss) { bossBad.Add(boss.Name + ": не собралась"); continue; }
            if (m.Security < 80) bossBad.Add(boss.Name + ": слабая защита");
            if (m.RewardDollars < 2000f) bossBad.Add(boss.Name + ": малая награда");
            if (!PySim.Simulate(m.Solution, m, 0).Success) bossBad.Add(boss.Name + ": решение не проходит");
            if (m.RequiredPatterns.Length == 0) bossBad.Add(boss.Name + ": нет требований");
        }
        Check("решения всех боссов проходят их требования", bossBad.Count == 0,
            bossBad.Count == 0 ? "ГИДРА · ЧЁРНЫЙ АРХИВ · СОВЕТ ДЕВЯТИ · ТИТАН"
                : string.Join(" | ", bossBad));

        Console.WriteLine();
        Console.WriteLine("=== Unity-ядро: игровой путь ===");
        Game fresh = NewGame();
        fresh.ResetProgress();
        Check("до обучения контракт не берётся", fresh.CreateContract("easy", 1234) == null);
        Check("сложности закрыты по уровню и библиотеке",
            fresh.TierUnlocked("easy") && !fresh.TierUnlocked("medium") && fresh.TierRequirement("medium").Contains("уровень"));

        fresh.HackSuccess(fresh.Tutorial, 3);
        Check("обучение засчитано", fresh.TutorialDone());

        Mission first = fresh.CreateContract("easy", 424242);
        Check("после обучения берётся контракт", first != null && first.Generated && fresh.Contracts.Count == 1,
            first == null ? "" : first.Title);
        Check("контракт попал в список целей", fresh.Missions().Count == 2);
        Check("активный контракт — взятый", fresh.ActiveContract() != null && fresh.ActiveContract().Id == first.Id);
        Check("повторный взлом не удваивает счётчик",
            CountAfterHack(fresh, first, 1) == 1, "закрыто контрактов: " + fresh.ContractsDone());

        BossStatus locked = fresh.BossStatus();
        Check("босс закрыт, пока не набрана цепочка",
            !locked.Ready && (locked.Reason.Contains("ЭКСПЕРТ") || locked.Reason.Contains("контрактов")),
            locked.Boss == null ? "" : locked.Boss.Name + " — " + locked.Reason);
        Check("у босса есть условие вызова", locked.Boss != null && locked.Need > 0,
            "нужно контрактов: " + locked.Need);

        // закрываем ещё контракты, пока не откроется босс
        int guard = 0;
        while (!fresh.BossStatus().Ready && guard++ < 40)
        {
            Mission m = fresh.CreateContract("easy", 90000 + guard);
            if (m == null) break;
            fresh.HackSuccess(m, 3);
            fresh.AddXp(2000);                       // поднимаем уровень, чтобы открылся ЭКСПЕРТ
            fresh.BuyUpgrade("codeLib");
        }
        Check("цепочка контрактов открывает первого босса", fresh.BossStatus().Ready,
            "закрыто контрактов: " + fresh.ContractsDone() + " · " + fresh.BossStatus().Reason);

        int beforeBoss = fresh.Contracts.Count;
        Mission bossMission = fresh.AcceptBoss();
        Check("вызов босса принят в терминал",
            bossMission != null && bossMission.Boss && fresh.Contracts.Count == beforeBoss + 1,
            bossMission == null ? "" : bossMission.Title);
        Mission again = fresh.AcceptBoss();
        Check("повторный вызов не дублирует босса",
            again != null && again.Id == bossMission.Id && fresh.Contracts.Count == beforeBoss + 1);

        fresh.HackSuccess(bossMission, 3);
        Check("босс повержен и посчитан", fresh.BossesDefeated() == 1 && fresh.IsBossDefeated(1));

        BossStatus next = fresh.BossStatus();
        Check("следующим идёт второй босс", next.Boss != null && next.Boss.Index == 2,
            next.Boss == null ? "" : next.Boss.Name + (next.Ready ? " — вызов доступен" : " — " + next.Reason));

        // цепочка до конца: после четвёртого босса вызовов больше нет
        Game saga = NewGame();
        saga.ResetProgress();
        foreach (BossData story in BossCatalog.List)
        {
            Mission part = BossCatalog.Build(story.Index, story.Index * 31);
            saga.HackSuccess(part, 3);
            saga.HackSuccess(part, 3);               // повторный взлом не удваивает победу
        }
        Check("вся цепочка боссов закрывается и заканчивается",
            saga.BossesDefeated() == 4 && saga.BossStatus().Boss == null &&
            saga.BossStatus().Reason == "все боссы повержены",
            "повержено " + saga.BossesDefeated() + " — " + saga.BossStatus().Reason);

        Console.WriteLine();
        Console.WriteLine("=== Unity-ядро: сохранения ===");
        fresh.Login = "neo_ghost";
        fresh.Onboarded = true;
        fresh.Save();
        Game restored = NewGame();
        Check("сейв: логин на месте", restored.Login == "neo_ghost", restored.Login);
        Check("сейв: экран входа пройден", restored.Onboarded);
        Check("сейв: контракты восстановлены", restored.Contracts.Count == fresh.Contracts.Count,
            restored.Contracts.Count + " шт.");
        Check("сейв: босс остался поверженным", restored.BossesDefeated() == 1);
        Check("сейв: миссии собираются из «номер + сложность + seed»",
            restored.Missions().Count == fresh.Missions().Count &&
            restored.CreateContract("easy", 555) != null);

        // старый сейв (версия 1, восемь ручных миссий) должен подхватываться
        string legacy = "{\"version\":1,\"dollars\":500.0,\"xp\":10,\"level\":3,"
            + "\"completedMissions\":[1,2,3],\"completedLessons\":[1],\"miners\":[],"
            + "\"cryptoIds\":[\"BTC\"],\"cryptoAmounts\":[0.5],"
            + "\"upgradeIds\":[\"hackSpeed\"],\"upgradeLevels\":[1],"
            + "\"totalHacked\":3,\"totalEarnedDollars\":200.0,\"totalTrades\":2,"
            + "\"soundOn\":true,\"realPython\":false,\"selectedMission\":2}";
        File.WriteAllText(savePath, legacy);
        Game old = NewGame();
        Check("старый сейв подхватывается", old.Level == 3 && old.TutorialDone() && old.Contracts.Count == 0,
            "уровень " + old.Level);
        Check("после старого сейва сложности открываются по уровню",
            old.TierUnlocked("easy") && old.TierUnlocked("medium") && !old.TierUnlocked("expert"));
        Check("после старого сейва можно взять контракт",
            old.CreateContract("medium", 777) != null && old.Contracts.Count == 1);

        Console.WriteLine();
        Console.WriteLine("=== Паритет с браузерной версией ===");
        if (args.Length == 0 || !File.Exists(args[0]))
        {
            Console.WriteLine("… пропущено: не передан файл эталонов (см. tools/unity/README.md)");
        }
        else
        {
            CompareWithWeb(args[0]);
        }

        Console.WriteLine();
        Console.WriteLine(failed == 0 ? "UNITY HARNESS OK (" + passed + " проверок)"
            : "UNITY HARNESS FAILED (" + failed + " из " + (passed + failed) + ")");
        return failed == 0 ? 0 : 1;
    }

    /// <summary>Взломать контракт и вернуть, сколько контрактов закрыто.</summary>
    static int CountAfterHack(Game game, Mission mission, int times)
    {
        for (int i = 0; i < times; i++) game.HackSuccess(mission, 3);
        return game.ContractsDone();
    }

    /* ------------------------------------------------------------------ */
    /*  Сверка контрактов с браузерной версией                             */
    /* ------------------------------------------------------------------ */
    static void CompareWithWeb(string path)
    {
        using (JsonDocument doc = JsonDocument.Parse(File.ReadAllText(path)))
        {
            JsonElement root = doc.RootElement;

            // 1. список шаблонов
            TemplateInfo[] mine = ContractGenerator.AllTemplates();
            JsonElement webTemplates = root.GetProperty("templates");
            Check("список шаблонов совпадает", webTemplates.GetArrayLength() == mine.Length,
                webTemplates.GetArrayLength() + " против " + mine.Length);

            // 2. контракты
            JsonElement contracts = root.GetProperty("contracts");
            List<string> diffs = new List<string>();
            int compared = 0;
            foreach (JsonElement c in contracts.EnumerateArray())
            {
                int index = c.GetProperty("index").GetInt32();
                string tier = c.GetProperty("tier").GetString();
                int seed = c.GetProperty("seed").GetInt32();
                int done = c.GetProperty("contractsDone").GetInt32();
                int codeLib = c.GetProperty("codeLib").GetInt32();
                string templateId = c.GetProperty("templateId").ValueKind == JsonValueKind.Null
                    ? null : c.GetProperty("templateId").GetString();

                Mission m = ContractGenerator.Generate(index, tier, seed, done, codeLib, templateId);
                DiffMission("контракт #" + index + " (" + tier + ", seed " + seed + ")",
                    c.GetProperty("mission"), m, diffs);
                compared++;
            }
            Check("контракты совпадают поле в поле (" + compared + " шт.)", diffs.Count == 0,
                diffs.Count == 0 ? "тексты, цели, IP, награды" : string.Join(" | ", diffs.GetRange(0, Math.Min(3, diffs.Count))));

            // 3. боссы
            JsonElement bosses = root.GetProperty("bosses");
            List<string> bossDiffs = new List<string>();
            int bossCompared = 0;
            foreach (JsonElement b in bosses.EnumerateArray())
            {
                int index = b.GetProperty("index").GetInt32();
                int seed = b.GetProperty("seed").GetInt32();
                Mission m = BossCatalog.Build(index, seed);
                DiffMission("босс #" + index, b.GetProperty("mission"), m, bossDiffs);
                bossCompared++;
            }
            Check("боссы совпадают поле в поле (" + bossCompared + " шт.)", bossDiffs.Count == 0,
                bossDiffs.Count == 0 ? "легенды, задания, награды"
                    : string.Join(" | ", bossDiffs.GetRange(0, Math.Min(3, bossDiffs.Count))));
        }
    }

    static void DiffMission(string label, JsonElement web, Mission mine, List<string> diffs)
    {
        if (mine == null) { diffs.Add(label + ": миссия не собралась"); return; }

        DiffString(label, web, "title", mine.Title, diffs);
        DiffString(label, web, "targetName", mine.TargetName, diffs);
        DiffString(label, web, "targetIp", mine.TargetIp, diffs);
        DiffString(label, web, "os", mine.Os, diffs);
        DiffString(label, web, "difficulty", mine.Difficulty, diffs);
        DiffString(label, web, "concept", mine.Concept, diffs);
        DiffString(label, web, "conceptDesc", mine.ConceptDesc, diffs);
        DiffString(label, web, "briefing", mine.Briefing, diffs);
        DiffString(label, web, "task", mine.Task, diffs);
        DiffString(label, web, "starterCode", mine.StarterCode, diffs);
        DiffString(label, web, "solution", mine.Solution, diffs);
        DiffString(label, web, "rewardCrypto", mine.RewardCrypto, diffs);
        DiffString(label, web, "tierLabel", mine.TierLabel, diffs);
        DiffString(label, web, "tierAccent", mine.TierAccent, diffs);
        DiffString(label, web, "codename", mine.Codename, diffs);
        DiffString(label, web, "bossName", mine.BossName, diffs);
        DiffNumber(label, web, "security", mine.Security, diffs);
        DiffNumber(label, web, "rewardDollars", mine.RewardDollars, diffs);
        DiffNumber(label, web, "rewardXp", mine.RewardXp, diffs);
        DiffNumber(label, web, "requiredCodeLib", mine.RequiredCodeLib, diffs);
        DiffNumber(label, web, "requiredLevel", mine.RequiredLevel, diffs);
        DiffNumber(label, web, "id", mine.Id, diffs);
        DiffBool(label, web, "generated", mine.Generated, diffs);
        DiffBool(label, web, "boss", mine.Boss, diffs);
        DiffFloat(label, web, "rewardAmount", mine.RewardAmount, diffs);

        string[] webPatterns = JsonArray(web, "requiredPatterns");
        if (webPatterns.Length != mine.RequiredPatterns.Length)
            diffs.Add(label + ": requiredPatterns размер " + webPatterns.Length + " против " + mine.RequiredPatterns.Length);
        else
            for (int i = 0; i < webPatterns.Length; i++)
                if (webPatterns[i] != mine.RequiredPatterns[i])
                { diffs.Add(label + ": requiredPatterns[" + i + "] отличается"); break; }

        string[] webHints = JsonArray(web, "hints");
        if (webHints.Length != mine.Hints.Length) diffs.Add(label + ": hints размер");
        else
            for (int i = 0; i < webHints.Length; i++)
                if (webHints[i] != mine.Hints[i]) { diffs.Add(label + ": hints[" + i + "] отличается"); break; }

        string[] webTheory = JsonArray(web, "theory");
        if (webTheory.Length != mine.Theory.Length) diffs.Add(label + ": theory размер");
        else
            for (int i = 0; i < webTheory.Length; i++)
                if (webTheory[i] != mine.Theory[i]) { diffs.Add(label + ": theory[" + i + "] отличается"); break; }
    }

    static string[] JsonArray(JsonElement obj, string name)
    {
        JsonElement el = obj.GetProperty(name);
        if (el.ValueKind != JsonValueKind.Array) return new string[0];
        List<string> list = new List<string>();
        foreach (JsonElement item in el.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String) list.Add(item.GetString());
            else list.Add(null);
        }
        return list.ToArray();
    }

    static void DiffString(string label, JsonElement web, string field, string mine, List<string> diffs)
    {
        JsonElement el = web.GetProperty(field);
        string theirs = el.ValueKind == JsonValueKind.Null ? "" : (el.ValueKind == JsonValueKind.String ? el.GetString() : el.ToString());
        if ((mine ?? "") != (theirs ?? ""))
            diffs.Add(label + ": " + field + " «" + Short(theirs) + "» ≠ «" + Short(mine) + "»");
    }

    static void DiffNumber(string label, JsonElement web, string field, double mine, List<string> diffs)
    {
        JsonElement el = web.GetProperty(field);
        if (el.ValueKind == JsonValueKind.Null) return;
        double theirs = el.GetDouble();
        if (Math.Abs(theirs - mine) > 0.0001)
            diffs.Add(label + ": " + field + " " + theirs + " ≠ " + mine);
    }

    static void DiffFloat(string label, JsonElement web, string field, float mine, List<string> diffs)
    {
        JsonElement el = web.GetProperty(field);
        if (el.ValueKind == JsonValueKind.Null) return;
        double theirs = el.GetDouble();
        // rewardAmount хранится во float — сравниваем с относительной точностью
        if (Math.Abs(theirs - mine) > Math.Max(1e-9, Math.Abs(theirs) * 1e-5))
            diffs.Add(label + ": " + field + " " + theirs.ToString("R", CultureInfo.InvariantCulture)
                + " ≠ " + mine.ToString("R", CultureInfo.InvariantCulture));
    }

    static void DiffBool(string label, JsonElement web, string field, bool mine, List<string> diffs)
    {
        JsonElement el = web.GetProperty(field);
        if (el.ValueKind == JsonValueKind.Null) return;
        bool theirs = el.ValueKind == JsonValueKind.True;
        if (theirs != mine) diffs.Add(label + ": " + field + " " + theirs + " ≠ " + mine);
    }

    static string Short(string text)
    {
        if (text == null) return "";
        return text.Length <= 46 ? text : text.Substring(0, 46) + "…";
    }
}
