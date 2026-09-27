/* ==========================================================================
   UnityStubs.cs — минимальные заглушки UnityEngine и UnityEngine.UI.

   Нужны только для офлайн-проверки: в песочнице нет Unity, но есть .NET SDK,
   поэтому мы подменяем типы движка и компилируем НАСТОЯЩИЕ файлы из
   Assets/Scripts. Так ловятся опечатки, несуществующие методы и битые ссылки
   во всём проекте — и ядро, и интерфейс.

   Заглушки ничего не рисуют: это только сигнатуры. Игра их не использует —
   в Unity подключаются настоящие UnityEngine/UnityEngine.UI.
   ========================================================================== */
using System;
using System.Collections.Generic;

namespace UnityEngine
{
    public struct Vector2
    {
        public float x, y;
        public Vector2(float x, float y) { this.x = x; this.y = y; }
        public static Vector2 zero { get { return new Vector2(0f, 0f); } }
        public static Vector2 one { get { return new Vector2(1f, 1f); } }
        public static Vector2 up { get { return new Vector2(0f, 1f); } }
        public static Vector2 right { get { return new Vector2(1f, 0f); } }
        public static Vector2 operator +(Vector2 a, Vector2 b) { return new Vector2(a.x + b.x, a.y + b.y); }
        public static Vector2 operator -(Vector2 a, Vector2 b) { return new Vector2(a.x - b.x, a.y - b.y); }
        public static Vector2 operator *(Vector2 a, float k) { return new Vector2(a.x * k, a.y * k); }
        public static Vector2 operator /(Vector2 a, float k) { return new Vector2(a.x / k, a.y / k); }
        public static bool operator ==(Vector2 a, Vector2 b) { return a.x == b.x && a.y == b.y; }
        public static bool operator !=(Vector2 a, Vector2 b) { return !(a == b); }
        public static implicit operator Vector2(Vector3 v) { return new Vector2(v.x, v.y); }
        public override bool Equals(object o) { return o is Vector2 && (Vector2)o == this; }
        public override int GetHashCode() { return 0; }
    }

    public struct Vector3
    {
        public float x, y, z;
        public Vector3(float x, float y, float z) { this.x = x; this.y = y; this.z = z; }
        public Vector3(float x, float y) { this.x = x; this.y = y; z = 0f; }
        public static Vector3 zero { get { return new Vector3(0f, 0f, 0f); } }
        public static Vector3 one { get { return new Vector3(1f, 1f, 1f); } }
        public static Vector3 operator +(Vector3 a, Vector3 b) { return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z); }
        public static Vector3 operator -(Vector3 a, Vector3 b) { return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z); }
        public static Vector3 operator *(Vector3 a, float k) { return new Vector3(a.x * k, a.y * k, a.z * k); }
        public static implicit operator Vector3(Vector2 v) { return new Vector3(v.x, v.y, 0f); }
    }

    public struct Vector4
    {
        public float x, y, z, w;
        public Vector4(float x, float y, float z, float w) { this.x = x; this.y = y; this.z = z; this.w = w; }
    }

    public struct Rect
    {
        public float x, y, width, height;
        public Rect(float x, float y, float width, float height)
        {
            this.x = x; this.y = y; this.width = width; this.height = height;
        }
        public float xMin { get { return x; } }
        public float yMin { get { return y; } }
        public float xMax { get { return x + width; } }
        public float yMax { get { return y + height; } }
    }

    public struct Color
    {
        public float r, g, b, a;
        public Color(float r, float g, float b, float a) { this.r = r; this.g = g; this.b = b; this.a = a; }
        public Color(float r, float g, float b) { this.r = r; this.g = g; this.b = b; a = 1f; }
        public static Color white { get { return new Color(1f, 1f, 1f, 1f); } }
        public static Color black { get { return new Color(0f, 0f, 0f, 1f); } }
        public static Color clear { get { return new Color(0f, 0f, 0f, 0f); } }
        public static Color operator *(Color c, float k) { return new Color(c.r * k, c.g * k, c.b * k, c.a * k); }
        public static Color operator *(float k, Color c) { return c * k; }
        public static Color operator +(Color a, Color b) { return new Color(a.r + b.r, a.g + b.g, a.b + b.b, a.a + b.a); }
    }

    public struct Color32
    {
        public byte r, g, b, a;
        public Color32(byte r, byte g, byte b, byte a) { this.r = r; this.g = g; this.b = b; this.a = a; }
        public static implicit operator Color(Color32 c)
        {
            return new Color(c.r / 255f, c.g / 255f, c.b / 255f, c.a / 255f);
        }
        public static implicit operator Color32(Color c)
        {
            return new Color32((byte)(c.r * 255f), (byte)(c.g * 255f), (byte)(c.b * 255f), (byte)(c.a * 255f));
        }
    }

    public static class ColorUtility
    {
        public static bool TryParseHtmlString(string html, out Color color)
        {
            color = Color.white;
            return true;
        }

        public static string ToHtmlStringRGBA(Color color) { return "FFFFFFFF"; }
        public static string ToHtmlStringRGB(Color color) { return "FFFFFF"; }
    }

    public static class Mathf
    {
        public const float PI = 3.14159265f;
        public const float Infinity = float.PositiveInfinity;
        public static float Abs(float v) { return Math.Abs(v); }
        public static int Abs(int v) { return Math.Abs(v); }
        public static float Min(float a, float b) { return Math.Min(a, b); }
        public static int Min(int a, int b) { return Math.Min(a, b); }
        public static float Max(float a, float b) { return Math.Max(a, b); }
        public static int Max(int a, int b) { return Math.Max(a, b); }
        public static float Clamp(float v, float lo, float hi) { return Math.Min(Math.Max(v, lo), hi); }
        public static int Clamp(int v, int lo, int hi) { return Math.Min(Math.Max(v, lo), hi); }
        public static float Clamp01(float v) { return Clamp(v, 0f, 1f); }
        public static float Lerp(float a, float b, float t) { return a + (b - a) * Clamp01(t); }
        public static float Sin(float v) { return (float)Math.Sin(v); }
        public static float Cos(float v) { return (float)Math.Cos(v); }
        public static float Sqrt(float v) { return (float)Math.Sqrt(v); }
        public static float Pow(float a, float b) { return (float)Math.Pow(a, b); }
        public static float Floor(float v) { return (float)Math.Floor(v); }
        public static int FloorToInt(float v) { return (int)Math.Floor(v); }
        public static float Ceil(float v) { return (float)Math.Ceiling(v); }
        public static int CeilToInt(float v) { return (int)Math.Ceiling(v); }
        public static float Round(float v) { return (float)Math.Round(v); }
        public static int RoundToInt(float v) { return (int)Math.Round(v, MidpointRounding.AwayFromZero); }
        public static float Repeat(float t, float length) { return t - (float)Math.Floor(t / length) * length; }
        public static float PingPong(float t, float length)
        {
            t = Repeat(t, length * 2f);
            return length - Math.Abs(t - length);
        }
        public static float MoveTowards(float cur, float target, float maxDelta)
        {
            return Math.Abs(target - cur) <= maxDelta ? target : cur + Math.Sign(target - cur) * maxDelta;
        }
    }

    public static class Debug
    {
        public static void Log(object message) { }
        public static void LogWarning(object message) { }
        public static void LogError(object message) { }
    }

    public class Object
    {
        public string name = "";
        public static void Destroy(Object obj) { }
        public static void DestroyImmediate(Object obj) { }
        public static void DontDestroyOnLoad(Object obj) { }
        public static T[] FindObjectsOfType<T>() where T : Object { return new T[0]; }
        public static T[] FindObjectsByType<T>(FindObjectsSortMode mode) where T : Object { return new T[0]; }
        public static T FindFirstObjectByType<T>() where T : Object { return null; }
        public static implicit operator bool(Object obj) { return !ReferenceEquals(obj, null); }
        public override string ToString() { return name; }
    }

    public enum FindObjectsSortMode { None, InstanceID }

    public class GameObject : Object
    {
        public GameObject() { }
        public GameObject(string name) { this.name = name; }
        public GameObject(string name, params Type[] components) { this.name = name; }
        public Transform transform = new Transform();
        public bool activeSelf = true;
        public bool activeInHierarchy = true;
        public void SetActive(bool value) { activeSelf = value; activeInHierarchy = value; }
        public T AddComponent<T>() where T : Component, new() { return new T(); }
        public Component AddComponent(Type type) { return null; }
        public T GetComponent<T>() where T : Component { return null; }
        public T GetComponentInChildren<T>() where T : Component { return null; }
        public T[] GetComponentsInChildren<T>(bool includeInactive) where T : Component { return new T[0]; }
        public T[] GetComponents<T>() where T : Component { return new T[0]; }
    }

    public class Component : Object
    {
        public GameObject gameObject = new GameObject();
        public Transform transform { get { return gameObject.transform; } }
        public T GetComponent<T>() where T : Component { return null; }
        public T GetComponentInParent<T>() where T : Component { return null; }
        public T[] GetComponentsInChildren<T>(bool includeInactive) where T : Component { return new T[0]; }
    }

    public class Behaviour : Component
    {
        public bool enabled = true;
    }

    public class MonoBehaviour : Behaviour
    {
        public void StopAllCoroutines() { }
        public Coroutine StartCoroutine(System.Collections.IEnumerator routine) { return null; }
    }

    public class Coroutine { }

    public class Transform : Component
    {
        public Transform parent;
        public Vector3 localScale = Vector3.one;
        public Vector3 position = Vector3.zero;
        public int childCount = 0;
        public void SetParent(Transform p, bool worldPositionStays) { parent = p; }
        public void SetParent(Transform p) { parent = p; }
        public Transform GetChild(int index) { return null; }
        public void SetAsLastSibling() { }
        public void SetAsFirstSibling() { }
        public void SetSiblingIndex(int index) { }
    }

    public class RectTransform : Transform
    {
        public Vector2 anchorMin = Vector2.zero;
        public Vector2 anchorMax = Vector2.one;
        public Vector2 pivot = new Vector2(0.5f, 0.5f);
        public Vector2 anchoredPosition = Vector2.zero;
        public Vector2 sizeDelta = Vector2.zero;
        public Vector2 offsetMin = Vector2.zero;
        public Vector2 offsetMax = Vector2.zero;
        public Rect rect = new Rect(0f, 0f, 100f, 100f);
        public RectTransform parent { get { return null; } }
        public void ForceUpdateRectTransforms() { }
    }

    public class RectOffset
    {
        public int left, right, top, bottom;
        public RectOffset() { }
        public RectOffset(int left, int right, int top, int bottom)
        {
            this.left = left; this.right = right; this.top = top; this.bottom = bottom;
        }
    }

    public class Camera : Behaviour { public static Camera main { get { return null; } } }

    public class Canvas : Behaviour
    {
        public RenderMode renderMode = RenderMode.ScreenSpaceOverlay;
        public int sortingOrder;
        public Camera worldCamera;
    }

    public class CanvasGroup : Behaviour { public float alpha = 1f; }

    public enum RenderMode { ScreenSpaceOverlay, ScreenSpaceCamera, WorldSpace }

    public class CanvasScaler : Behaviour
    {
        public enum ScaleMode { ConstantPixelSize, ScaleWithScreenSize, ConstantPhysicalSize }
        public enum ScreenMatchMode { MatchWidthOrHeight, Expand, Shrink }
        public ScaleMode uiScaleMode = ScaleMode.ScaleWithScreenSize;
        public Vector2 referenceResolution = new Vector2(1280f, 720f);
        public ScreenMatchMode screenMatchMode = ScreenMatchMode.MatchWidthOrHeight;
        public float matchWidthOrHeight = 0.5f;
    }

    public class Font : Object
    {
        public bool HasCharacter(char c) { return true; }
        public static Font CreateDynamicFontFromOSFont(string name, int size) { return new Font(); }
    }

    public class Texture : Object { }

    public class Texture2D : Texture
    {
        public int width, height;
        public FilterMode filterMode = FilterMode.Bilinear;
        public TextureWrapMode wrapMode = TextureWrapMode.Repeat;
        public Texture2D(int width, int height) { this.width = width; this.height = height; }
        public Texture2D(int width, int height, TextureFormat format, bool mipChain)
        {
            this.width = width; this.height = height;
        }
        public void SetPixel(int x, int y, Color color) { }
        public void SetPixels(Color[] colors) { }
        public void SetPixels32(Color32[] colors) { }
        public Color GetPixel(int x, int y) { return Color.white; }
        public Color32[] GetPixels32() { return new Color32[0]; }
        public void Apply() { }
        public void Apply(bool updateMipmaps) { }
        public static Texture2D whiteTexture { get { return new Texture2D(1, 1); } }
    }

    public enum TextureFormat { RGBA32, ARGB32, RGB24, Alpha8, RGBAFloat }
    public enum FilterMode { Point, Bilinear, Trilinear }
    public enum TextureWrapMode { Repeat, Clamp, Mirror }

    public class Sprite : Object
    {
        public Rect rect = new Rect(0f, 0f, 1f, 1f);
        public Texture2D texture;
        public Vector4 border = new Vector4(0f, 0f, 0f, 0f);
        public float pixelsPerUnit = 100f;

        public static Sprite Create(Texture2D texture, Rect rect, Vector2 pivot) { return new Sprite(); }
        public static Sprite Create(Texture2D texture, Rect rect, Vector2 pivot, float pixelsPerUnit)
        {
            return new Sprite();
        }
        public static Sprite Create(Texture2D texture, Rect rect, Vector2 pivot, float pixelsPerUnit,
            uint extrude, SpriteMeshType meshType, Vector4 border)
        {
            return new Sprite();
        }
        public static Sprite Create(Texture2D texture, Rect rect, Vector2 pivot, float pixelsPerUnit,
            uint extrude, SpriteMeshType meshType)
        {
            return new Sprite();
        }
    }

    public enum SpriteMeshType { FullRect, Tight }

    public class Material : Object { }

    public class TextAsset : Object { public string text = ""; }

    public static class Resources
    {
        /// <summary>Каталог с данными для офлайн-проверки (в Unity его нет).</summary>
        public static string DataRoot = "";

        public static T Load<T>(string path) where T : Object
        {
            if (typeof(T) != typeof(TextAsset) || string.IsNullOrEmpty(DataRoot)) return null;
            string file = System.IO.Path.Combine(DataRoot, path + ".json");
            if (!System.IO.File.Exists(file)) return null;
            TextAsset asset = new TextAsset();
            asset.text = System.IO.File.ReadAllText(file);
            return asset as T;
        }

        public static T GetBuiltinResource<T>(string path) where T : Object { return null; }
    }

    public static class JsonUtility
    {
        static readonly System.Text.Json.JsonSerializerOptions Options =
            new System.Text.Json.JsonSerializerOptions { IncludeFields = true, WriteIndented = true };

        public static string ToJson(object obj) { return ToJson(obj, false); }

        public static string ToJson(object obj, bool prettyPrint)
        {
            return System.Text.Json.JsonSerializer.Serialize(obj, obj.GetType(), Options);
        }

        public static T FromJson<T>(string json)
        {
            return System.Text.Json.JsonSerializer.Deserialize<T>(json, Options);
        }

        public static void FromJsonOverwrite(string json, object target) { }
    }

    public static class Application
    {
        public static string persistentDataPath = "/tmp/cryptohack-unity";
        public static string dataPath = "/tmp/cryptohack-unity";
        public static bool isEditor = true;
        public static bool isPlaying = true;
        public static RuntimePlatform platform = RuntimePlatform.LinuxPlayer;
        public static int targetFrameRate = 60;
        public static void Quit() { }
    }

    public enum RuntimePlatform { LinuxPlayer, WindowsPlayer, OSXPlayer, LinuxEditor, WindowsEditor }

    public static class Screen
    {
        public static int width = 1280;
        public static int height = 720;
        public static bool fullScreen;
        public static void SetResolution(int width, int height, bool fullscreen) { }
    }

    public static class Time
    {
        public static float deltaTime = 0.016f;
        public static float unscaledDeltaTime = 0.016f;
        public static float time = 0f;
        public static float timeScale = 1f;
        public static float realtimeSinceStartup = 0f;
    }

    public static class Input
    {
        public static Vector3 mousePosition = Vector3.zero;
        public static Vector2 mouseScrollDelta = Vector2.zero;
        public static string inputString = "";
        public static bool GetKeyDown(KeyCode key) { return false; }
        public static bool GetKey(KeyCode key) { return false; }
        public static bool GetKeyUp(KeyCode key) { return false; }
        public static bool GetMouseButtonDown(int button) { return false; }
        public static bool GetMouseButtonUp(int button) { return false; }
        public static bool GetMouseButton(int button) { return false; }
        public static bool anyKeyDown { get { return false; } }
    }

    public enum KeyCode
    {
        None, Backspace, Delete, Tab, Return, Escape, Space, Home, End,
        LeftArrow, RightArrow, UpArrow, DownArrow, PageUp, PageDown,
        LeftShift, RightShift, LeftControl, RightControl, LeftAlt, RightAlt,
        LeftCommand, RightCommand, CapsLock, Insert,
        Alpha0, Alpha1, Alpha2, Alpha3, Alpha4, Alpha5, Alpha6, Alpha7, Alpha8, Alpha9,
        KeypadEnter, F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12,
        A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z
    }

    public static class Random
    {
        static System.Random _random = new System.Random(12345);
        public static void InitState(int seed) { _random = new System.Random(seed); }
        public static int Range(int minInclusive, int maxExclusive) { return _random.Next(minInclusive, maxExclusive); }
        public static float Range(float min, float max) { return min + (float)_random.NextDouble() * (max - min); }
        public static float value { get { return (float)_random.NextDouble(); } }
        public static Vector2 insideUnitCircle { get { return Vector2.zero; } }
    }

    public static class PlayerPrefs
    {
        static readonly Dictionary<string, string> Values = new Dictionary<string, string>();
        public static void SetString(string key, string value) { Values[key] = value; }
        public static string GetString(string key, string def = "") { return Values.ContainsKey(key) ? Values[key] : def; }
        public static void SetInt(string key, int value) { Values[key] = value.ToString(); }
        public static int GetInt(string key, int def = 0)
        {
            int v;
            return Values.ContainsKey(key) && int.TryParse(Values[key], out v) ? v : def;
        }
        public static void SetFloat(string key, float value) { Values[key] = value.ToString(); }
        public static float GetFloat(string key, float def = 0f)
        {
            float v;
            return Values.ContainsKey(key) && float.TryParse(Values[key], out v) ? v : def;
        }
        public static bool HasKey(string key) { return Values.ContainsKey(key); }
        public static void DeleteKey(string key) { Values.Remove(key); }
        public static void DeleteAll() { Values.Clear(); }
        public static void Save() { }
    }

    public static class RectTransformUtility
    {
        public static bool RectangleContainsScreenPoint(RectTransform rect, Vector2 screenPoint, Camera cam)
        {
            return false;
        }
        public static bool ScreenPointToLocalPointInRectangle(RectTransform rect, Vector2 screenPoint,
            Camera cam, out Vector2 localPoint)
        {
            localPoint = Vector2.zero;
            return false;
        }
    }

    public class AudioClip : Object
    {
        public static AudioClip Create(string name, int lengthSamples, int channels, int frequency, bool stream)
        {
            return new AudioClip();
        }
        public static AudioClip Create(string name, int lengthSamples, int channels, int frequency, bool stream,
            PCMReaderCallback callback)
        {
            return new AudioClip();
        }

        public bool SetData(float[] data, int offsetSamples) { return true; }
        public int samples { get { return 0; } }
        public int channels { get { return 1; } }
        public delegate void PCMReaderCallback(float[] data);
    }

    public class AudioSource : Behaviour
    {
        public AudioClip clip;
        public bool playOnAwake = true;
        public bool loop;
        public float volume = 1f;
        public float pitch = 1f;
        public float spatialBlend;
        public bool isPlaying;
        public void Play() { }
        public void Stop() { }
        public void PlayOneShot(AudioClip clip, float volumeScale) { }
    }

    public class AudioListener : Behaviour { }

    public enum TextAnchor
    {
        UpperLeft, UpperCenter, UpperRight,
        MiddleLeft, MiddleCenter, MiddleRight,
        LowerLeft, LowerCenter, LowerRight
    }

    public enum HorizontalWrapMode { Wrap, Overflow }
    public enum VerticalWrapMode { Truncate, Overflow }

    public enum RuntimeInitializeLoadType { AfterSceneLoad, BeforeSceneLoad, BeforeSplashScreen, SubsystemRegistration, AfterAssembliesLoaded }

    [AttributeUsage(AttributeTargets.Method)]
    public class RuntimeInitializeOnLoadMethodAttribute : Attribute
    {
        public RuntimeInitializeOnLoadMethodAttribute() { }
        public RuntimeInitializeOnLoadMethodAttribute(RuntimeInitializeLoadType type) { }
    }

    [AttributeUsage(AttributeTargets.Field)]
    public class SerializeFieldAttribute : Attribute { }

    [AttributeUsage(AttributeTargets.Class)]
    public class RequireComponent : Attribute { public RequireComponent(Type type) { } }

    public static class Cursor
    {
        public static bool visible = true;
    }
}

namespace UnityEngine.UI
{
    public class Graphic : Behaviour
    {
        public Color color = Color.white;
        public bool raycastTarget = true;
        public RectTransform rectTransform { get { return null; } }
        public void SetAllDirty() { }
    }

    public class MaskableGraphic : Graphic { }

    public class Image : MaskableGraphic
    {
        public enum Type { Simple, Sliced, Tiled, Filled }
        public Sprite sprite;
        public Type type = Type.Simple;
        public bool preserveAspect;
        public bool fillCenter = true;
    }

    public class RawImage : MaskableGraphic
    {
        public Texture texture;
        public Rect uvRect = new Rect(0f, 0f, 1f, 1f);
    }

    public class Text : MaskableGraphic
    {
        public string text = "";
        public Font font;
        public int fontSize = 14;
        public TextAnchor alignment = TextAnchor.UpperLeft;
        public bool supportRichText = true;
        public HorizontalWrapMode horizontalOverflow = HorizontalWrapMode.Wrap;
        public VerticalWrapMode verticalOverflow = VerticalWrapMode.Truncate;
        public float lineSpacing = 1f;
        public bool resizeTextForBestFit;
        public int resizeTextMinSize, resizeTextMaxSize;
        public bool alignByGeometry;
    }

    public class LayoutElement : Behaviour
    {
        public float minWidth = -1f, minHeight = -1f;
        public float preferredWidth = -1f, preferredHeight = -1f;
        public float flexibleWidth = -1f, flexibleHeight = -1f;
        public int layoutPriority = 1;
        public bool ignoreLayout;
    }

    public class LayoutGroup : Behaviour
    {
        public RectOffset padding = new RectOffset();
        public TextAnchor childAlignment = TextAnchor.UpperLeft;
    }

    public class HorizontalOrVerticalLayoutGroup : LayoutGroup
    {
        public float spacing;
        public bool childControlWidth = true, childControlHeight = true;
        public bool childForceExpandWidth = true, childForceExpandHeight = false;
        public bool childScaleWidth, childScaleHeight;
        public bool reverseArrangement;
    }

    public class VerticalLayoutGroup : HorizontalOrVerticalLayoutGroup { }
    public class HorizontalLayoutGroup : HorizontalOrVerticalLayoutGroup { }

    public class GridLayoutGroup : LayoutGroup
    {
        public enum Constraint { Flexible, FixedColumnCount, FixedRowCount }
        public Vector2 cellSize = new Vector2(100f, 100f);
        public Vector2 spacing = Vector2.zero;
        public Constraint constraint = Constraint.Flexible;
        public int constraintCount = 2;
    }

    public class ContentSizeFitter : Behaviour
    {
        public enum FitMode { Unconstrained, MinSize, PreferredSize }
        public FitMode horizontalFit = FitMode.Unconstrained;
        public FitMode verticalFit = FitMode.Unconstrained;
    }

    public class RectMask2D : Behaviour { }

    public static class LayoutRebuilder
    {
        public static void ForceRebuildLayoutImmediate(RectTransform rect) { }
        public static void MarkLayoutForRebuild(RectTransform rect) { }
    }
}
