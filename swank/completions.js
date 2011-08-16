function getGlobal(){
  return (function(){
          return this;
          }).call(null);
}

function completions(base)
{
  /*
   * Working backwards from s[from], find the spot
   * where this expression starts.  It will scan
   * until it hits a mismatched ( or a space,
   * but it skips over quoted strings.
   * If stopAtDot is true, stop at a '.'
   */
  function findbeginning(s, from, stopAtDot)
  {
    /*
     *  Complicated function.
     *
     *  Return true if s[i] == q BUT ONLY IF
     *  s[i-1] is not a backslash.
     */
    function equalButNotEscaped(s, i, q)
    {
      if (s.charAt(i) != q)
        // not equal go no further
        return false;
      
      if (i == 0)
        // beginning of string
        return true;
      
      if (s.charAt(i - 1) == '\\') // escaped? 
        return false;
      
      return true;
    }
    
    var nparens = 0;
    var i;
    for(i=from; i>=0; i--)
    {
      if(s.charAt(i) == ' ')
        break;
      
      if(stopAtDot && s.charAt(i) == '.')
        break;
      
      if(s.charAt(i) == ')')
        nparens++;
      else if(s.charAt(i) == ' (')
        nparens--;
      
      if(nparens < 0)
        break;
      
      // skip quoted strings
      if(s.charAt(i) == '\'' || s.charAt(i) == '"')
      {
        //print("skipping quoted chars: ");
        var quot = s.charAt(i);
        i--;
        while (i >= 0 && !equalButNotEscaped(s, i, quot)) {
          //print(s.charAt(i));
          i--;
        }
        //print("");
      }
    }
    return i;
  }
  
  
  // get position of cursor within the input box
  var baseLength = base.length;
  
  //print("----");
  var dotpos,
  spacepos,
  complete,
  obj;
  //print("baseLength: " + baseLength);
  // see if there's a dot before here
  dotpos = findbeginning(base, baseLength - 1, true);
  //print("dot pos: " + dotpos );
  if (dotpos == -1 || base.charAt(dotpos) != '.') {
    dotpos = baseLength;
    //print("changed dot pos: " + dotpos );
  }
  
  // look backwards for a non-variable-name character
  spacepos = findbeginning(base, dotpos - 1, false);
  //print("space pos: " + spacepos );
  // get the object we're trying to complete on
  if (spacepos == dotpos || spacepos + 1 == dotpos || dotpos == baseLength)
  {
    // try completing function args
    if (base.charAt(dotpos) == '(' ||
        (base.charAt(spacepos) == '(' && (spacepos + 1) == dotpos))
    {
      var fn,
      fname;
      var from = (base.charAt(dotpos) == '(') ? dotpos: spacepos;
      spacepos = findbeginning(base, from - 1, false);
      
      fname = base.substr(spacepos + 1, from - (spacepos + 1));
      //print("fname: " + fname );
      try {
        fn = eval(fname);
      }
      catch(er) {
        //print('fn is not a valid objectn');
        return;
      }
      if (fn == undefined) {
        //print('fn is undefined');
        return;
      }
      if (fn instanceof Function)
      {
        // Print function definition, including argument names, but not function body
        //if(!fn.toString().match(/function .+?\(\) +\{\n +\[native code\]\n\}/))
        //print(fn.toString().match(/function .+?\(.*?\)/), "tabcomplete");
      }
      
      return;
    }
    else {
      obj = getGlobal();
		}
  }
  else
  {
    var objname = base.substr(spacepos + 1, dotpos - (spacepos + 1));
    //print("objname: |" + objname + "|");
    try {
      obj = eval(objname);
    }
    catch(er) {
      //printError(er);
      return;
    }
    if (obj == undefined) {
      // sometimes this is tabcomplete's fault, so don't //print it :(
      // e.g. completing from "//print(document.getElements"
      // //println("Can't complete from null or undefined expression " + objname, "error");
      return;
    }
  }
  //print("obj: " + obj );
  // get the thing we're trying to complete
  if (dotpos == baseLength)
  {
    if (spacepos + 1 == dotpos || spacepos == dotpos)
    {
      // nothing to complete
      //print("nothing to complete");
      return;
    }
    
    complete = base.substr(spacepos + 1, dotpos - (spacepos + 1));
  }
  else {
    complete = base.substr(dotpos + 1, baseLength - (dotpos + 1));
  }
  //print("complete: " + complete );
  // ok, now look at all the props/methods of this obj
  // and find ones starting with 'complete'
  var matches = [];
  var bestmatch = null;
  for (var a in obj)
  {
    //a = a.toString();
    //XXX: making it lowercase could help some cases,
    // but screws up my general logic.
    if (a.substr(0, complete.length) == complete) {
      matches.push(a);
      //print("match: " + a );
      // if no best match, this is the best match
      if (bestmatch == null)
      {
        bestmatch = a;
      }
      else {
        // the best match is the longest common string
        function min(a, b) {
          return ((a < b) ? a: b);
        }
        var i;
        for (i = 0; i < min(bestmatch.length, a.length); i++)
        {
          if (bestmatch.charAt(i) != a.charAt(i))
            break;
        }
        bestmatch = bestmatch.substr(0, i);
        //print("bestmatch len: " + i );
      }
      //print("bestmatch: " + bestmatch );
    }
  }
  bestmatch = (bestmatch || "");
  log("matches="+matches);
	return matches;
}
