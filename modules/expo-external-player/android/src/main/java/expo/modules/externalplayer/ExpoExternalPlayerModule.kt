package expo.modules.externalplayer

import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.core.content.FileProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

object ExpoExternalPlayerLauncher {
    private const val TAG = "ExpoExternalPlayer"

    fun open(context: Context, url: String, packageName: String?): Boolean {
        if (url.isBlank()) return false

        val uri = getPlayableUri(context, url) ?: run {
            Log.w(TAG, "Could not build a playable URI for $url")
            return false
        }
        val candidates = buildCandidateIntents(uri, packageName?.takeIf { it.isNotBlank() })

        // player intent filters differ, so try the common video handoff shapes
        for ((label, candidate) in candidates) {
            try {
                context.startActivity(candidate)
                Log.i(TAG, "Opened $packageName via $label for $uri")
                return true
            } catch (error: ActivityNotFoundException) {
                Log.w(TAG, "No activity for $packageName via $label: ${error.message}")
                continue
            } catch (error: SecurityException) {
                Log.w(TAG, "SecurityException for $packageName via $label: ${error.message}")
                continue
            }
        }

        Log.w(TAG, "No installed player accepted the stream (package=$packageName)")
        return false
    }

    private fun getPlayableUri(context: Context, url: String): Uri? {
        val uri = Uri.parse(url)
        if (uri.scheme != "file") return uri

        val path = uri.path ?: return null
        val file = File(path)
        if (!file.exists()) return null

        // Other apps can read them through FileProvider after we grant access to the player intent
        return try {
            FileProvider.getUriForFile(
                context,
                "${context.packageName}.FileSystemFileProvider",
                file,
            )
        } catch (_: IllegalArgumentException) {
            null
        }
    }

    private fun buildCandidateIntents(uri: Uri, packageName: String?): List<Pair<String, Intent>> {
        // mpv-android documents video/any for URLs without a recognizable file extension, which
        // is how Seanime's streaming endpoints are exposed. The wider types are fallbacks for
        // players (and mpv builds) whose filters only declare video/* or */*.
        if (packageName == "is.xyz.mpv") {
            return listOf(
                "video/any" to baseIntent(packageName, uri).setDataAndType(uri, "video/any"),
                "video/*" to baseIntent(packageName, uri).setDataAndType(uri, "video/*"),
                "no type" to baseIntent(packageName, uri).setData(uri),
                "*/*" to baseIntent(packageName, uri).setDataAndType(uri, "*/*"),
            )
        }

        return listOf(
            "video/*" to baseIntent(packageName, uri).setDataAndType(uri, "video/*"),
            "no type" to baseIntent(packageName, uri).setData(uri),
            "*/*" to baseIntent(packageName, uri).setDataAndType(uri, "*/*"),
        )
    }

    private fun baseIntent(packageName: String?, uri: Uri): Intent {
        return Intent(Intent.ACTION_VIEW).apply {
            addCategory(Intent.CATEGORY_DEFAULT)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            clipData = ClipData.newRawUri("video", uri)
            if (packageName != null) setPackage(packageName)
        }
    }
}

class ExpoExternalPlayerModule : Module() {
    private val context
        get() = requireNotNull(appContext.reactContext)

    override fun definition() = ModuleDefinition {
        Name("ExpoExternalPlayer")

        AsyncFunction("open") { url: String, packageName: String?, promise: Promise ->
            promise.resolve(ExpoExternalPlayerLauncher.open(context, url, packageName))
        }

        AsyncFunction("openFile") { url: String, packageName: String?, promise: Promise ->
            promise.resolve(ExpoExternalPlayerLauncher.open(context, url, packageName))
        }

        AsyncFunction("isPackageInstalled") { packageName: String, promise: Promise ->
            val installed = try {
                context.packageManager.getPackageInfo(packageName, 0)
                true
            } catch (_: Exception) {
                false
            }
            promise.resolve(installed)
        }
    }
}
