//
//  JSCocoaSwankAppDelegate.m
//  JSCocoaSwank
//
//  Created by Steve White on 8/15/11.
//  Copyright 2011 Steve White. All rights reserved.
//

#import "JSCocoaSwankAppDelegate.h"
#import "JSCocoaController.h"

@implementation JSCocoaSwankAppDelegate

@synthesize window;

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
  JSCocoaController *jsCocoa = [JSCocoaController sharedController];
  NSArray *files = [NSArray arrayWithObjects:@"swank-utils", @"swank-lisp", @"swank-handler", @"swank-protocol", @"swank-server", @"completions", nil];
  NSBundle *mainBundle = [NSBundle mainBundle];
  for (NSString *file in files) {
    [jsCocoa evalJSFile:[mainBundle pathForResource:file ofType:@"js"]];
  }
}

@end
